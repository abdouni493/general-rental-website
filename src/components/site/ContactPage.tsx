import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Phone, Mail, MapPin, MessageCircle, Building2, ArrowRight,
  Clock, HelpCircle, ShieldCheck,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';
import { FleetService } from '../../services/FleetService';
import { SectionHeading } from './HomePage';
import { agencyColor, agencyTint } from '../../utils/format';
import type { AgencyContact } from '../../types';

// ============================================================================
// Page « Contact »
// ----------------------------------------------------------------------------
// Le portail n'exploite aucun véhicule : il n'y a donc PAS de formulaire de
// contact qui irait nulle part. La page dirige explicitement vers l'agence
// concernée, dont les coordonnées sont lues en direct chez elle.
// ============================================================================

export const ContactPage: React.FC = () => {
  const { lang, agencies } = useApp();
  const [contacts, setContacts] = useState<AgencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agencies.length === 0) { setLoading(false); return; }
    let cancelled = false;
    FleetService.getAllContacts(agencies)
      .then(list => { if (!cancelled) setContacts(list); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [agencies]);

  const faq = [
    {
      q: { fr: 'Qui gère ma réservation ?', ar: 'من يدير حجزي؟' },
      a: {
        fr: "L'agence propriétaire du véhicule que vous avez choisi. Votre demande lui parvient instantanément et c'est elle qui vous rappelle pour la confirmer, établir le contrat et vous remettre les clés.",
        ar: 'الوكالة المالكة للسيارة التي اخترتها. يصلها طلبك فورا وهي من تتصل بك لتأكيده.',
      },
    },
    {
      q: { fr: 'Pourquoi le lieu de départ change selon la voiture ?', ar: 'لماذا يتغير مكان المغادرة حسب السيارة؟' },
      a: {
        fr: "Chaque agence a ses propres points de retrait. Une fois le véhicule sélectionné, seuls les lieux de SON agence vous sont proposés : elle ne peut pas vous livrer depuis le parking d'une autre enseigne.",
        ar: 'لكل وكالة نقاط استلام خاصة بها. بعد اختيار السيارة تُقترح فقط مواقع وكالتها.',
      },
    },
    {
      q: { fr: 'Le prix affiché est-il définitif ?', ar: 'هل السعر المعروض نهائي؟' },
      a: {
        fr: "Il reprend exactement le tarif de l'agence, promotions comprises, auquel s'ajoutent les options que vous cochez. La caution reste à régler au retrait et vous est restituée au retour du véhicule.",
        ar: 'يعكس تماما تعريفة الوكالة مع العروض. الضمان يُدفع عند الاستلام ويُسترجع عند الإرجاع.',
      },
    },
    {
      q: { fr: 'Puis-je annuler ?', ar: 'هل يمكنني الإلغاء؟' },
      a: {
        fr: "Les conditions d'annulation sont celles de l'agence qui loue le véhicule. Contactez-la directement avec les coordonnées ci-dessous.",
        ar: 'شروط الإلغاء هي شروط الوكالة المؤجرة. اتصل بها مباشرة.',
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-ink)' }}
    >
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow={lang === 'fr' ? 'Nous joindre' : 'تواصل معنا'}
          title={lang === 'fr' ? 'Parlez à la bonne agence' : 'تحدث إلى الوكالة المناسبة'}
          description={
            lang === 'fr'
              ? "DriveHub réunit plusieurs loueurs indépendants. Pour une réservation en cours, adressez-vous directement à l'agence qui détient le véhicule."
              : 'يجمع DriveHub عدة مؤجرين مستقلين. لحجز جار، اتصل مباشرة بالوكالة المالكة للسيارة.'
          }
        />

        {/* ── Coordonnées par agence ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-16">
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="rounded-2xl p-6 h-56 skeleton" />
              ))
            : agencies.map((agency, i) => {
                const contact = contacts.find(c => c.agencyKey === agency.id);
                const accent = agencyColor(agency.brandColor);

                return (
                  <motion.div
                    key={agency.id}
                    initial={{ opacity: 0, y: 32 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                    whileHover={{ y: -4 }}
                    className="ring-aurora rounded-2xl p-6 flex flex-col gap-4"
                    style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}
                  >
                    <div className="flex items-center gap-3">
                      {agency.logoUrl ? (
                        <img src={agency.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white"
                          style={{ background: accent, fontFamily: 'var(--font-display)' }}
                        >
                          {agency.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p
                          className="font-black text-base truncate"
                          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                        >
                          {agency.name}
                        </p>
                        {agency.city && (
                          <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{agency.city}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm flex-1">
                      {contact?.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
                          style={{ color: 'var(--color-title)', background: agencyTint(agency.brandColor, 0.07), border: '1px solid var(--color-line-soft)' }}
                        >
                          <Phone size={14} style={{ color: accent }} />
                          <span className="font-semibold">{contact.phone}</span>
                        </a>
                      ) : (
                        <p className="text-xs px-3 py-2.5" style={{ color: 'var(--color-faint)' }}>
                          {lang === 'fr' ? 'Téléphone non communiqué' : 'الهاتف غير متوفر'}
                        </p>
                      )}

                      {contact?.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl break-all transition-colors"
                          style={{ color: 'var(--color-body)', background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
                        >
                          <Mail size={14} style={{ color: accent }} className="shrink-0" />
                          <span className="text-xs">{contact.email}</span>
                        </a>
                      )}

                      {contact?.address && (
                        <p className="flex items-start gap-2.5 px-3 text-xs" style={{ color: 'var(--color-muted)' }}>
                          <MapPin size={13} style={{ color: accent }} className="mt-0.5 shrink-0" />
                          {contact.address}
                        </p>
                      )}
                    </div>

                    {contact?.whatsapp && (
                      <a
                        href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost w-full h-11 text-xs"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                  </motion.div>
                );
              })}
        </div>

        {/* ── Questions fréquentes ── */}
        <div className="mb-14">
          <h2
            className="font-black text-2xl mb-6 flex items-center gap-2.5"
            style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
          >
            <HelpCircle size={22} style={{ color: 'var(--color-iris)' }} />
            {lang === 'fr' ? 'Questions fréquentes' : 'أسئلة شائعة'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faq.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.08 }}
                className="rounded-2xl p-5"
                style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}
              >
                <h3
                  className="font-bold text-base mb-2.5"
                  style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                >
                  {item.q[lang]}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  {item.a[lang]}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Rappels ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: ShieldCheck, text: { fr: 'Aucune donnée bancaire demandée sur le portail', ar: 'لا نطلب أي بيانات بنكية' } },
            { icon: Clock, text: { fr: 'Disponibilité vérifiée en direct chez chaque agence', ar: 'يتم التحقق من التوفر مباشرة' } },
            { icon: Building2, text: { fr: `${agencies.length} agences indépendantes réunies`, ar: `${agencies.length} وكالات مستقلة` } },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl px-4 py-4"
              style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}
            >
              <item.icon size={18} style={{ color: 'var(--color-aqua)' }} className="shrink-0" />
              <p className="text-xs font-medium" style={{ color: 'var(--color-body)' }}>{item.text[lang]}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/offres" className="btn-aurora h-13 px-8 py-4 text-sm">
            {lang === 'fr' ? 'Parcourir les véhicules' : 'تصفح السيارات'} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
