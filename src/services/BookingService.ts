import { supabase } from '../lib/supabase';
import { getAgencyClient, withTimeout } from '../lib/agencyClients';
import type {
  PublicAgency, Car, PickupPoint, PersonalInfo, FlightInfo,
  SelectedService, ProtectionAssurance, ReservationResult,
} from '../types';

// ============================================================================
// BookingService — routage des réservations vers l'agence propriétaire
// ----------------------------------------------------------------------------
// C'est LE point où le portail écrit. La règle est absolue :
//
//   une réservation part TOUJOURS dans le projet Supabase de l'agence qui
//   possède le véhicule, jamais dans la base du portail.
//
// L'écriture passe par la RPC `create_website_reservation` que les trois
// applications d'agence exposent déjà à l'anon (SECURITY DEFINER). Elle crée
// le client, la réservation au statut `website_reservation` / source
// `website` et ses services, en UNE transaction, après avoir revérifié la
// disponibilité côté serveur. La commande apparaît donc immédiatement dans
// l'écran « Commandes du site » de l'agence, exactement comme si le client
// était passé par son propre site.
//
// Le portail ne garde qu'une TRACE analytique (portal_reservations) : de quoi
// alimenter la page Statistiques sans dupliquer la moindre donnée métier.
//
// Compatibilité des dialectes
// ---------------------------
// Les trois schémas divergent sur un point : la colonne de devise s'appelle
// `currency_code` chez SZ Cars et `currency` chez iCar / MHD. La charge utile
// porte donc LES DEUX clés — chaque fonction lit celle qu'elle connaît et
// ignore l'autre.
//
// Les codes promo ne sont volontairement PAS proposés sur le portail : selon
// l'agence, la RPC applique la remise elle-même ou attend un total déjà
// remisé. Envoyer un code depuis un site neutre fausserait la comptabilité
// d'une partie des agences. Les promotions restent gérées par les offres
// spéciales, qui, elles, sont lues de façon identique partout.
// ============================================================================

export interface BookingPayload {
  agency: PublicAgency;
  car: Car;
  departureDate: string;   // YYYY-MM-DD
  departureTime: string;   // HH:mm
  returnDate: string;      // YYYY-MM-DD
  returnTime: string;      // HH:mm
  departurePoint: PickupPoint;
  returnPoint: PickupPoint;
  personal: PersonalInfo;
  flight: FlightInfo;
  assurance: ProtectionAssurance | null;
  services: SelectedService[];
  notes: string;
  totalDays: number;
  pricePerDay: number;
  totalPrice: number;
}

/** Messages d'erreur renvoyés par les RPC d'agence → texte lisible. */
const ERROR_LABELS: Record<string, { fr: string; ar: string }> = {
  CAR_UNAVAILABLE: {
    fr: "Ce véhicule vient d'être réservé sur ces dates. Choisissez une autre période ou une autre voiture.",
    ar: 'تم حجز هذه السيارة للتو في هذه التواريخ. اختر فترة أخرى أو سيارة أخرى.',
  },
  INVALID_DATES: {
    fr: 'La date de retour doit être postérieure à la date de départ.',
    ar: 'يجب أن يكون تاريخ الإرجاع بعد تاريخ المغادرة.',
  },
  INVALID_RESERVATION_DATA: {
    fr: 'Des informations obligatoires sont manquantes.',
    ar: 'بعض المعلومات المطلوبة مفقودة.',
  },
  TIMEOUT: {
    fr: "L'agence ne répond pas pour le moment. Réessayez dans un instant.",
    ar: 'الوكالة لا تستجيب حاليا. حاول مرة أخرى بعد قليل.',
  },
  AGENCY_CONNECTION_INCOMPLETE: {
    fr: "La connexion à cette agence est incomplète. Contactez-nous pour finaliser votre réservation.",
    ar: 'الاتصال بهذه الوكالة غير مكتمل. اتصل بنا لإتمام الحجز.',
  },
};

export function translateBookingError(raw: string, lang: 'fr' | 'ar'): string {
  const key = Object.keys(ERROR_LABELS).find(k => raw?.includes(k));
  if (key) return ERROR_LABELS[key][lang];
  return lang === 'fr'
    ? `La réservation n'a pas pu être enregistrée : ${raw}. Vos informations sont conservées, vous pouvez réessayer.`
    : `تعذر تسجيل الحجز: ${raw}. تم الاحتفاظ بمعلوماتك، يمكنك المحاولة مرة أخرى.`;
}

export class BookingService {
  static async createReservation(payload: BookingPayload): Promise<ReservationResult> {
    const { agency, car, personal } = payload;
    const carLabel = `${car.brand} ${car.model}`.trim();
    const clientName = `${personal.firstName} ${personal.lastName}`.trim();

    try {
      const client = getAgencyClient(agency);

      // Garde-fou anti double-réservation, côté portail.
      //
      // La RPC de l'agence est CENSÉE revérifier la disponibilité elle-même,
      // et la plupart le font. Mais les versions déployées ne sont pas toutes
      // à jour : au moins une agence exécute une variante sans garde-fou, qui
      // accepterait donc deux locations sur la même période. Comme le portail
      // peut envoyer chez n'importe laquelle, il relit le planning juste avant
      // d'écrire. Cela ne remplace pas un verrou serveur — deux clients à la
      // même seconde passeraient encore — mais cela ferme la fenêtre qui
      // compte vraiment : celle entre la recherche et la confirmation, où
      // l'internaute a passé plusieurs minutes dans le tunnel.
      const blocked = await withTimeout(
        client.rpc('get_reserved_periods', { p_car_id: car.id }), 12_000,
      );
      if (!blocked.error && Array.isArray(blocked.data)) {
        const overlaps = blocked.data.some((row: any) => {
          const from = String(row?.departure_date || '').slice(0, 10);
          const to = String(row?.return_date || '').slice(0, 10);
          return from && to && from <= payload.returnDate && to >= payload.departureDate;
        });
        if (overlaps) throw new Error('CAR_UNAVAILABLE');
      }

      const clientPayload = {
        first_name: personal.firstName,
        last_name: personal.lastName,
        phone: personal.phone,
        email: personal.email,
        date_of_birth: personal.dateOfBirth,
        place_of_birth: personal.placeOfBirth,
        id_card_number: personal.documentType === 'id_card' ? personal.documentNumber : '',
        license_number: personal.licenseNumber,
        license_expiration_date: personal.licenseExpiration,
        license_delivery_date: personal.licenseDelivery,
        license_delivery_place: personal.licenseDeliveryPlace,
        document_type: personal.documentType,
        document_number: personal.documentNumber,
        document_delivery_date: personal.documentDelivery,
        document_expiration_date: personal.documentExpiration,
        document_delivery_address: personal.documentDeliveryAddress,
        wilaya: personal.wilaya,
        complete_address: personal.completeAddress,
        profile_photo: '',
        scanned_documents: [],
      };

      const reservationPayload = {
        car_id: car.id,
        departure_date: payload.departureDate,
        departure_time: payload.departureTime,
        departure_agency_id: payload.departurePoint.id,
        return_date: payload.returnDate,
        return_time: payload.returnTime,
        return_agency_id: payload.returnPoint.id,
        price_per_day: payload.pricePerDay,
        price_week: car.priceWeek || '',
        price_month: car.priceMonth || '',
        total_days: payload.totalDays,
        total_price: payload.totalPrice,
        deposit: car.deposit,
        discount_amount: 0,
        discount_type: 'fixed',
        notes: buildNotes(payload),
        protection_assurance_id: payload.assurance?.id || '',
        protection_assurance_name: payload.assurance?.name || '',
        protection_assurance_price: payload.assurance?.pricePerDay ?? 0,
        // Deux graphies de la même colonne — voir l'en-tête du fichier.
        currency_code: 'DZD',
        currency: 'DZD',
        currency_rate: 1,
        total_price_currency: payload.totalPrice,
        flight_number: payload.flight.number || '',
        flight_date: payload.flight.date || '',
        flight_time: payload.flight.time || '',
        flight_ticket_image: '',
      };

      const servicesPayload = payload.services.map(s => ({
        category: s.category || 'service',
        service_name: s.name,
        description: s.description || '',
        price: s.price,
      }));

      const { data, error } = await withTimeout(
        client.rpc('create_website_reservation', {
          p_client: clientPayload,
          p_reservation: reservationPayload,
          p_services: servicesPayload,
          p_promo_code: null,
        }),
        25_000,
      );

      if (error) throw new Error(error.message);

      const result: ReservationResult = {
        reservationId: data?.reservation_id || '',
        clientId: data?.client_id || '',
        agencyName: agency.name,
        agencyPhone: null,
        agencyEmail: null,
        totalPrice: Number(data?.total_price ?? payload.totalPrice),
      };

      // Trace analytique — ne doit jamais faire échouer une réservation déjà
      // enregistrée chez l'agence.
      await this.log({
        agencyId: agency.id,
        agencyName: agency.name,
        remoteReservationId: result.reservationId,
        carId: car.id,
        carLabel,
        clientName,
        clientPhone: personal.phone,
        clientEmail: personal.email,
        departureDate: payload.departureDate,
        returnDate: payload.returnDate,
        totalDays: payload.totalDays,
        totalPrice: result.totalPrice,
        pickupPointName: payload.departurePoint.name,
        status: 'sent',
        errorMessage: null,
      }).catch(() => undefined);

      return result;
    } catch (err: any) {
      const message = err?.message || 'ERREUR_INCONNUE';

      await this.log({
        agencyId: agency.id,
        agencyName: agency.name,
        remoteReservationId: null,
        carId: car.id,
        carLabel,
        clientName,
        clientPhone: personal.phone,
        clientEmail: personal.email,
        departureDate: payload.departureDate,
        returnDate: payload.returnDate,
        totalDays: payload.totalDays,
        totalPrice: payload.totalPrice,
        pickupPointName: payload.departurePoint.name,
        status: 'failed',
        errorMessage: message.slice(0, 500),
      }).catch(() => undefined);

      throw new Error(message);
    }
  }

  /** Journalise la tentative dans la base du portail (RPC SECURITY DEFINER). */
  private static async log(entry: {
    agencyId: string; agencyName: string; remoteReservationId: string | null;
    carId: string; carLabel: string; clientName: string;
    clientPhone: string; clientEmail: string;
    departureDate: string; returnDate: string; totalDays: number; totalPrice: number;
    pickupPointName: string; status: 'sent' | 'failed'; errorMessage: string | null;
  }): Promise<void> {
    const { error } = await supabase.rpc('log_portal_reservation', {
      p_agency_id: entry.agencyId,
      p_agency_name: entry.agencyName,
      p_remote_reservation_id: entry.remoteReservationId,
      p_car_id: entry.carId,
      p_car_label: entry.carLabel,
      p_client_name: entry.clientName,
      p_client_phone: entry.clientPhone,
      p_client_email: entry.clientEmail,
      p_departure_date: entry.departureDate,
      p_return_date: entry.returnDate,
      p_total_days: entry.totalDays,
      p_total_price: entry.totalPrice,
      p_currency_code: 'DZD',
      p_pickup_point_name: entry.pickupPointName,
      p_status: entry.status,
      p_error_message: entry.errorMessage,
    });
    if (error) console.warn('[portail] journalisation impossible :', error.message);
  }
}

/**
 * Note portée sur la réservation côté agence. Elle rend l'origine évidente
 * dans le back-office sans rien changer à leur schéma.
 */
function buildNotes(payload: BookingPayload): string {
  const lines = [
    '— Réservation reçue via le portail DriveHub —',
    `Lieu de départ : ${payload.departurePoint.name}${payload.departurePoint.city ? ` (${payload.departurePoint.city})` : ''}`,
    `Lieu de retour : ${payload.returnPoint.name}${payload.returnPoint.city ? ` (${payload.returnPoint.city})` : ''}`,
  ];
  if (payload.flight.number) {
    lines.push(`Vol : ${payload.flight.number} — ${payload.flight.date} ${payload.flight.time}`.trim());
  }
  if (payload.assurance) {
    lines.push(`Assurance : ${payload.assurance.name} (${payload.assurance.pricePerDay} DA/jour)`);
  }
  if (payload.services.length) {
    lines.push(`Services : ${payload.services.map(s => s.name).join(', ')}`);
  }
  if (payload.notes.trim()) {
    lines.push('', `Message du client : ${payload.notes.trim()}`);
  }
  return lines.join('\n');
}
