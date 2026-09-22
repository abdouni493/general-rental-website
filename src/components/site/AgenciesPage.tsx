import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  MapPin, Phone, Mail, Car as CarIcon, Building2, ArrowRight,
  Facebook, Instagram, MessageCircle,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';
import { FleetService } from '../../services/FleetService';
import { SectionHeading } from './HomePage';
import { EmptyState, PageLoader } from '../ui/Primitives';
import { agencyColor, agencyTint, money } from '../../utils/format';
import type { AgencyContact } from '../../types';

// ============================================================================
// Page « Agences » — une fiche par agence partenaire, avec ses coordonnées
// (lues chez elle), ses points de retrait et un raccourci vers sa flotte.
// ============================================================================

export const AgenciesPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang, agencies, cars, pickupPoints, setAgencyFilter, isLoading } = useApp();
  const [contacts, setContacts] = useState<AgencyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    if (agencies.length === 0) { setLoadingContacts(false); return; }
    let cancelled = false;
    FleetService.getAllContacts(agencies)
      .then(list => { if (!cancelled) setContacts(list); })
      .finally(() => { if (!cancelled) setLoadingContacts(false); });
    return () => { cancelled = true; };
  }, [agencies]);

  const browseAgency = (key: string) => {
    setAgencyFilter(key);
    navigate('/offres');
  };

  if (isLoading) return <div className="pt-32"><PageLoader /></div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-ink)' }}
    >
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow={lang === 'fr' ? 'Notre réseau' : 'شبكتنا'}
          title={lang === 'fr' ? 'Les agences partenaires' : 'الوكالات الشريكة'}
          description={
            lang === 'fr'
              ? "Chaque véhicule du portail appartient à l'une de ces agences. C'est elle qui vous remet les clés, établit le contrat et encaisse la location."
              : 'كل سيارة في البوابة تعود لإحدى هذه الوكالات.'
          }
        />

        {agencies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={lang === 'fr' ? 'Aucune agence connectée' : 'لا توجد وكالة متصلة'}
            description={
              lang === 'fr'
                ? "Le portail n'a encore aucun partenaire enregistré. Les connexions se créent depuis l'espace d'administration."
                : 'لم تُسجَّل أي شراكة بعد.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agencies.map((agency, i) => {
              const accent = agencyColor(agency.brandColor);
              const contact = contacts.find(c => c.agencyKey === agency.id);
              const fleet = cars.filter(c => c.agencyKey === agency.id);
              const points = pickupPoints.filter(p => p.agencyKey === agency.id);
              const cheapest = fleet.length ? Math.min(...fleet.map(c => c.priceDay)) : 0;

              return (
                <motion.div
                  key={agency.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: (i % 2) * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="ring-aurora rounded-2xl overflow-hidden flex flex-col"
                  style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-panel)' }}
                >
                  {/* Bandeau de marque */}
                  <div
                    className="h-2"
                    style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
                  />

                  <div className="p-6 flex-1 flex flex-col gap-5">
                    {/* Identité */}
                    <div className="flex items-start gap-4">
                      {agency.logoUrl || contact?.logo ? (
                        <img
                          src={agency.logoUrl || contact?.logo || ''}
                          alt=""
                          className="w-16 h-16 rounded-2xl object-cover shrink-0"
                          style={{ border: `1px solid ${agencyTint(agency.brandColor, 0.3)}` }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shrink-0"
                          style={{ background: accent, fontFamily: 'var(--font-display)' }}
                        >
                          {agency.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-black text-xl leading-tight"
                          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                        >
                          {agency.name}
                        </h3>
                        {agency.city && (
                          <p className="text-xs flex items-center gap-1.5 mt-1" style={{ color: 'var(--color-muted)' }}>
                            <MapPin size={12} style={{ color: accent }} /> {agency.city}
                          </p>
                        )}
                        {contact?.description && (
                          <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--color-muted)' }}>
                            {contact.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Chiffres clés */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { value: `${fleet.length}`, label: { fr: 'véhicules', ar: 'سيارة' } },
                        { value: `${points.length}`, label: { fr: 'lieux', ar: 'مواقع' } },
                        { value: cheapest ? money(cheapest, lang) : '—', label: { fr: 'dès /jour', ar: 'ابتداء' } },
                      ].map((stat, k) => (
                        <div
                          key={k}
                          className="rounded-xl px-3 py-2.5 text-center"
                          style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
                        >
                          <p
                            className="font-black text-base leading-none truncate"
                            style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                          >
                            {stat.value}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--color-faint)' }}>
                            {stat.label[lang]}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Points de retrait */}
                    {points.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-muted)' }}>
                          {lang === 'fr' ? 'Points de retrait' : 'نقاط الاستلام'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {points.map(p => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                              style={{ color: 'var(--color-body)', background: agencyTint(agency.brandColor, 0.08), border: `1px solid ${agencyTint(agency.brandColor, 0.22)}` }}
                            >
                              <MapPin size={10} style={{ color: accent }} /> {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coordonnées */}
                    {(contact?.phone || contact?.email || contact?.address) && (
                      <div className="space-y-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:underline">
                            <Phone size={12} style={{ color: accent }} /> {contact.phone}
                          </a>
                        )}
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:underline break-all">
                            <Mail size={12} style={{ color: accent }} /> {contact.email}
                          </a>
                        )}
                        {contact.address && (
                          <p className="flex items-start gap-2">
                            <MapPin size={12} style={{ color: accent }} className="mt-0.5 shrink-0" /> {contact.address}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Réseaux */}
                    {contact && (contact.facebook || contact.instagram || contact.whatsapp) && (
                      <div className="flex gap-2">
                        {contact.facebook && (
                          <SocialLink href={contact.facebook} accent={accent} label="Facebook"><Facebook size={14} /></SocialLink>
                        )}
                        {contact.instagram && (
                          <SocialLink
                            href={contact.instagram.startsWith('http') ? contact.instagram : `https://instagram.com/${contact.instagram}`}
                            accent={accent}
                            label="Instagram"
                          >
                            <Instagram size={14} />
                          </SocialLink>
                        )}
                        {contact.whatsapp && (
                          <SocialLink
                            href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                            accent={accent}
                            label="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </SocialLink>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => browseAgency(agency.id)}
                      disabled={fleet.length === 0}
                      className="btn-ghost w-full h-12 text-xs mt-auto"
                    >
                      <CarIcon size={15} />
                      {fleet.length === 0
                        ? (lang === 'fr' ? 'Aucun véhicule en ligne' : 'لا توجد سيارات')
                        : (lang === 'fr' ? `Voir les ${fleet.length} véhicules` : `عرض ${fleet.length} سيارة`)}
                      {fleet.length > 0 && <ArrowRight size={14} />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SocialLink: React.FC<{ href: string; accent: string; label: string; children: React.ReactNode }> = ({
  href, accent, label, children,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    title={label}
    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
    style={{ color: accent, background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-line-soft)'; }}
  >
    {children}
  </a>
);
