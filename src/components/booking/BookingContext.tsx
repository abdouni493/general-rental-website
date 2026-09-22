import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useApp } from '../../context/AppContext';
import { FleetService } from '../../services/FleetService';
import { BookingService, translateBookingError } from '../../services/BookingService';
import { daysBetween, today } from '../../utils/dates';
import { currentOfferForCar } from '../../utils/format';
import type {
  Car, PickupPoint, ProtectionAssurance, AgencyService, SelectedService,
  PersonalInfo, FlightInfo, DateRange, SearchCriteria, BlockedRange,
  ReservationResult, PublicAgency,
} from '../../types';

// ============================================================================
// État du tunnel de réservation
// ----------------------------------------------------------------------------
// Toute la saisie vit ici : revenir en arrière ne perd jamais une information,
// et une erreur d'envoi laisse le formulaire intact pour réessayer.
//
// LA RÈGLE CENTRALE DU PORTAIL
// ----------------------------
// Dès qu'une voiture est choisie, son agence propriétaire devient le cadre de
// tout ce qui suit :
//   • les LIEUX de départ et de retour sont ceux de cette agence, et d'elle
//     seule (`availablePoints`) ;
//   • les ASSURANCES et les SERVICES proposés sont son catalogue à elle ;
//   • les dates bloquées viennent de son planning ;
//   • la réservation part dans SA base.
// Changer de voiture pour une autre agence remet donc à zéro lieux, assurance
// et services : les garder produirait une réservation incohérente.
// ============================================================================

export const STEP_COUNT = 6;

const EMPTY_PERSONAL: PersonalInfo = {
  firstName: '', lastName: '', phone: '', email: '',
  dateOfBirth: '', placeOfBirth: '',
  licenseNumber: '', licenseExpiration: '', licenseDelivery: '', licenseDeliveryPlace: '',
  documentType: 'none', documentNumber: '', documentDelivery: '', documentExpiration: '',
  documentDeliveryAddress: '',
  wilaya: '16 - Alger', completeAddress: '',
};

const EMPTY_FLIGHT: FlightInfo = { number: '', date: '', time: '' };

interface BookingContextValue {
  // Navigation
  step: number;
  goToStep: (n: number) => void;
  next: () => void;
  prev: () => void;
  isStepValid: (n: number) => boolean;
  furthestStep: number;

  // Étape 1 — véhicule et dates
  car: Car | null;
  selectCar: (car: Car | null) => void;
  agency: PublicAgency | null;
  range: DateRange;
  setRange: React.Dispatch<React.SetStateAction<DateRange>>;
  departureTime: string;
  setDepartureTime: (v: string) => void;
  returnTime: string;
  setReturnTime: (v: string) => void;
  blockedRanges: BlockedRange[];
  loadingBlocked: boolean;

  // Recherche venue du landing
  search: SearchCriteria | null;
  eligibleCars: Car[];
  loadingAvailability: boolean;

  // Étape 2 — lieux (agence propriétaire uniquement)
  availablePoints: PickupPoint[];
  loadingPoints: boolean;
  departurePointId: string;
  setDeparturePointId: (id: string) => void;
  differentReturn: boolean;
  setDifferentReturn: (v: boolean) => void;
  returnPointId: string;
  setReturnPointId: (id: string) => void;
  departurePoint: PickupPoint | null;
  returnPoint: PickupPoint | null;

  // Étape 3 — assurance
  assurances: ProtectionAssurance[];
  loadingAssurances: boolean;
  assurance: ProtectionAssurance | null;
  setAssurance: (a: ProtectionAssurance | null) => void;

  // Étape 4 — services
  services: AgencyService[];
  loadingServices: boolean;
  selectedServices: SelectedService[];
  toggleService: (service: AgencyService) => void;

  // Étape 5 — informations
  personal: PersonalInfo;
  setPersonal: React.Dispatch<React.SetStateAction<PersonalInfo>>;
  flight: FlightInfo;
  setFlight: React.Dispatch<React.SetStateAction<FlightInfo>>;

  // Étape 6 — récapitulatif
  notes: string;
  setNotes: (v: string) => void;

  // Tarification
  days: number;
  pricePerDay: number;
  basePrice: number;
  offerDiscount: number;
  servicesTotal: number;
  assuranceTotal: number;
  total: number;

  // Envoi
  isSubmitting: boolean;
  submitError: string | null;
  result: ReservationResult | null;
  submit: () => Promise<void>;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export const useBooking = (): BookingContextValue => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking doit être utilisé dans <BookingProvider>');
  return ctx;
};

export const BookingProvider: React.FC<{
  initialCar?: Car | null;
  initialSearch?: SearchCriteria | null;
  children: React.ReactNode;
}> = ({ initialCar = null, initialSearch = null, children }) => {
  const { lang, cars, agencies, specialOffers, agencyById } = useApp();

  const [step, setStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);

  const [car, setCar] = useState<Car | null>(initialCar);
  const [range, setRange] = useState<DateRange>(
    initialSearch ? { from: initialSearch.from, to: initialSearch.to } : {},
  );
  const [departureTime, setDepartureTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('10:00');
  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  const [unavailableIds, setUnavailableIds] = useState<Set<string> | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(!!initialSearch);

  const [availablePoints, setAvailablePoints] = useState<PickupPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [departurePointId, setDeparturePointId] = useState('');
  const [differentReturn, setDifferentReturn] = useState(false);
  const [returnPointId, setReturnPointId] = useState('');

  const [assurances, setAssurances] = useState<ProtectionAssurance[]>([]);
  const [loadingAssurances, setLoadingAssurances] = useState(false);
  const [assurance, setAssurance] = useState<ProtectionAssurance | null>(null);

  const [services, setServices] = useState<AgencyService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);

  const [personal, setPersonal] = useState<PersonalInfo>(EMPTY_PERSONAL);
  const [flight, setFlight] = useState<FlightInfo>(EMPTY_FLIGHT);
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ReservationResult | null>(null);

  const search = initialSearch;
  const agency = car ? agencyById(car.agencyKey) || null : null;

  // ── Voitures éligibles à l'étape 1 ────────────────────────────────────────
  // Le filtre d'agence de la recherche ET la disponibilité sur la période
  // s'appliquent ensemble.
  const eligibleCars = useMemo(() => {
    let list = cars;
    if (search?.agencyKey) list = list.filter(c => c.agencyKey === search.agencyKey);
    if (unavailableIds) list = list.filter(c => !unavailableIds.has(c.id));
    return list;
  }, [cars, search?.agencyKey, unavailableIds]);

  // ── Disponibilité globale sur la période recherchée ───────────────────────
  useEffect(() => {
    if (!search || agencies.length === 0) { setLoadingAvailability(false); return; }
    let cancelled = false;
    setLoadingAvailability(true);
    FleetService.getUnavailableCarIds(agencies, search.from, search.to)
      .then(ids => { if (!cancelled) setUnavailableIds(ids); })
      .catch(() => { if (!cancelled) setUnavailableIds(null); })
      .finally(() => { if (!cancelled) setLoadingAvailability(false); });
    return () => { cancelled = true; };
  }, [search?.from, search?.to, agencies]);

  // ── Dates déjà prises pour le véhicule choisi ─────────────────────────────
  useEffect(() => {
    if (!car || !agency) { setBlockedRanges([]); return; }
    let cancelled = false;
    setLoadingBlocked(true);
    FleetService.getBlockedRanges(agency, car.id)
      .then(ranges => { if (!cancelled) setBlockedRanges(ranges); })
      .catch(() => { if (!cancelled) setBlockedRanges([]); })
      .finally(() => { if (!cancelled) setLoadingBlocked(false); });
    return () => { cancelled = true; };
  }, [car?.id, agency?.id]);

  // ── Catalogue de l'agence propriétaire : lieux, assurances, services ──────
  // C'est ici que se matérialise la règle « lieux de l'agence du véhicule ».
  useEffect(() => {
    if (!agency) {
      setAvailablePoints([]); setAssurances([]); setServices([]);
      return;
    }
    let cancelled = false;

    setLoadingPoints(true);
    setLoadingAssurances(true);
    setLoadingServices(true);

    FleetService.getPickupPointsFor(agency)
      .then(points => {
        if (cancelled) return;
        setAvailablePoints(points);
        // Une seule adresse ? On la présélectionne, le client n'a rien à faire.
        if (points.length === 1) setDeparturePointId(points[0].id);
      })
      .finally(() => { if (!cancelled) setLoadingPoints(false); });

    FleetService.getAssurancesFor(agency)
      .then(list => { if (!cancelled) setAssurances(list); })
      .finally(() => { if (!cancelled) setLoadingAssurances(false); });

    FleetService.getServicesFor(agency)
      .then(list => {
        if (cancelled) return;
        setServices(list);
        // Les services obligatoires de l'agence sont cochés d'office.
        const mandatory = list.filter(s => s.isMandatory).map(toSelected);
        if (mandatory.length) {
          setSelectedServices(prev => {
            const missing = mandatory.filter(m => !prev.some(p => p.id === m.id));
            return missing.length ? [...prev, ...missing] : prev;
          });
        }
      })
      .finally(() => { if (!cancelled) setLoadingServices(false); });

    return () => { cancelled = true; };
  }, [agency?.id]);

  // ── Choix du véhicule ─────────────────────────────────────────────────────
  const selectCar = useCallback((next: Car | null) => {
    setCar(prev => {
      const agencyChanged = prev?.agencyKey !== next?.agencyKey;
      if (agencyChanged) {
        // Tout ce qui dépend de l'agence redevient vierge.
        setDeparturePointId('');
        setReturnPointId('');
        setDifferentReturn(false);
        setAssurance(null);
        setSelectedServices([]);
      }
      return next;
    });

    // Les dates bloquées diffèrent d'un véhicule à l'autre : on ne conserve
    // la période que si elle vient d'une recherche (ces voitures sont déjà
    // filtrées comme disponibles sur cette période).
    if (!search) setRange({});
  }, [search]);

  const toggleService = useCallback((service: AgencyService) => {
    if (service.isMandatory) return; // verrouillé par l'agence
    setSelectedServices(prev =>
      prev.some(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, toSelected(service)],
    );
  }, []);

  const departurePoint = availablePoints.find(p => p.id === departurePointId) || null;
  const returnPoint = differentReturn
    ? availablePoints.find(p => p.id === returnPointId) || null
    : departurePoint;

  // ── Tarification ──────────────────────────────────────────────────────────
  const days = daysBetween(range.from, range.to);
  const offer = car ? currentOfferForCar(car.id, specialOffers) : undefined;
  const pricePerDay = offer ? offer.newPrice : car?.priceDay || 0;
  const basePrice = (car?.priceDay || 0) * days;
  const offerDiscount = offer && car ? Math.max(0, (car.priceDay - offer.newPrice) * days) : 0;
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const assuranceTotal = assurance ? assurance.pricePerDay * days : 0;
  const total = Math.max(0, basePrice - offerDiscount + servicesTotal + assuranceTotal);

  // ── Validation par étape ──────────────────────────────────────────────────
  const isStepValid = useCallback((n: number): boolean => {
    switch (n) {
      case 1:
        return !!car && !!range.from && !!range.to && range.from <= range.to
          && range.from >= today() && !!departureTime && !!returnTime;
      case 2:
        return !!departurePointId && (!differentReturn || !!returnPointId);
      case 3:
      case 4:
        return true; // assurance et services restent facultatifs
      case 5:
        return !!(
          personal.firstName.trim() && personal.lastName.trim() &&
          personal.phone.trim() && personal.email.trim() &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim()) &&
          personal.licenseNumber.trim() && personal.wilaya
        );
      case 6:
        return true;
      default:
        return false;
    }
  }, [car, range, departureTime, returnTime, departurePointId, differentReturn, returnPointId, personal]);

  const goToStep = useCallback((n: number) => {
    if (n < 1 || n > STEP_COUNT) return;
    // Avancer exige que toutes les étapes franchies soient valides.
    if (n > step) {
      for (let i = step; i < n; i++) {
        if (!isStepValid(i)) return;
      }
    }
    setStep(n);
    setFurthestStep(f => Math.max(f, n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, isStepValid]);

  const next = useCallback(() => goToStep(step + 1), [goToStep, step]);
  const prev = useCallback(() => goToStep(step - 1), [goToStep, step]);

  // ── Envoi ─────────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (!car || !agency || !departurePoint || !returnPoint || isSubmitting || result) return;
    if (!range.from || !range.to) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await BookingService.createReservation({
        agency, car,
        departureDate: range.from,
        departureTime,
        returnDate: range.to,
        returnTime,
        departurePoint,
        returnPoint,
        personal,
        flight,
        assurance,
        services: selectedServices,
        notes,
        totalDays: days,
        pricePerDay,
        totalPrice: total,
      });
      setResult(created);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setSubmitError(translateBookingError(err?.message || 'ERREUR', lang));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    car, agency, departurePoint, returnPoint, isSubmitting, result, range,
    departureTime, returnTime, personal, flight, assurance, selectedServices,
    notes, days, pricePerDay, total, lang,
  ]);

  const reset = useCallback(() => {
    setStep(1); setFurthestStep(1);
    setCar(null); setRange({});
    setDeparturePointId(''); setReturnPointId(''); setDifferentReturn(false);
    setAssurance(null); setSelectedServices([]);
    setPersonal(EMPTY_PERSONAL); setFlight(EMPTY_FLIGHT); setNotes('');
    setResult(null); setSubmitError(null);
  }, []);

  const value: BookingContextValue = {
    step, goToStep, next, prev, isStepValid, furthestStep,
    car, selectCar, agency, range, setRange,
    departureTime, setDepartureTime, returnTime, setReturnTime,
    blockedRanges, loadingBlocked,
    search, eligibleCars, loadingAvailability,
    availablePoints, loadingPoints,
    departurePointId, setDeparturePointId,
    differentReturn, setDifferentReturn,
    returnPointId, setReturnPointId,
    departurePoint, returnPoint,
    assurances, loadingAssurances, assurance, setAssurance,
    services, loadingServices, selectedServices, toggleService,
    personal, setPersonal, flight, setFlight,
    notes, setNotes,
    days, pricePerDay, basePrice, offerDiscount, servicesTotal, assuranceTotal, total,
    isSubmitting, submitError, result, submit, reset,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

const toSelected = (service: AgencyService): SelectedService => ({
  id: service.id,
  category: service.category,
  name: service.name,
  description: service.description,
  price: service.price,
  isMandatory: service.isMandatory,
});
