import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, X, Car as CarIcon, ArrowUpDown, Fuel, Cog, Loader2 } from 'lucide-react';

import { useApp } from '../../context/AppContext';
import { CarCard, CarCardSkeleton } from './CarCard';
import { CarDetailsModal } from './CarDetailsModal';
import { AgencyFilter } from './AgencyFilter';
import { EmptyState, ErrorBanner } from '../ui/Primitives';
import { currentOfferForCar } from '../../utils/format';
import type { Car } from '../../types';

// ============================================================================
// Page « Véhicules » — la grille complète, filtrable par agence (exigence du
// cahier des charges), par énergie, par boîte de vitesses, par recherche
// texte, et triable par prix.
// ============================================================================

type SortKey = 'price-asc' | 'price-desc' | 'brand' | 'recent';

export const FleetPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang, filteredCars, specialOffers, isLoading, isSyncing, loadError, reload, agencyFilter } = useApp();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('price-asc');
  const [energy, setEnergy] = useState('');
  const [transmission, setTransmission] = useState('');
  const [detailCar, setDetailCar] = useState<Car | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Les listes déroulantes ne proposent que des valeurs réellement présentes.
  const energies = useMemo(
    () => [...new Set(filteredCars.map(c => c.energy).filter(Boolean))].sort(),
    [filteredCars],
  );
  const transmissions = useMemo(
    () => [...new Set(filteredCars.map(c => c.transmission).filter(Boolean))].sort(),
    [filteredCars],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = filteredCars.filter(car => {
      if (energy && car.energy !== energy) return false;
      if (transmission && car.transmission !== transmission) return false;
      if (!needle) return true;
      return `${car.brand} ${car.model} ${car.agencyName} ${car.color}`.toLowerCase().includes(needle);
    });

    list = [...list];
    switch (sort) {
      case 'price-asc':  list.sort((a, b) => a.priceDay - b.priceDay); break;
      case 'price-desc': list.sort((a, b) => b.priceDay - a.priceDay); break;
      case 'brand':      list.sort((a, b) => `${a.brand}${a.model}`.localeCompare(`${b.brand}${b.model}`)); break;
      default: break; // 'recent' = ordre renvoyé par les agences
    }
    return list;
  }, [filteredCars, query, energy, transmission, sort]);

  const activeFilterCount = [energy, transmission, query.trim()].filter(Boolean).length;

  const clearFilters = () => { setEnergy(''); setTransmission(''); setQuery(''); };

  const openBooking = (car: Car) =>
    navigate('/reserver', { state: { carId: car.id, agencyKey: car.agencyKey } });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-ink)' }}
    >
      <div className="max-w-7xl mx-auto">

        {/* ── En-tête ── */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] mb-3"
            style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
          >
            {lang === 'fr' ? 'Catalogue complet' : 'الكتالوج الكامل'}
          </p>
          <h1
            className="font-black text-4xl sm:text-6xl leading-tight"
            style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
          >
            {lang === 'fr' ? 'La ' : ''}<span className="text-aurora">{lang === 'fr' ? 'flotte' : 'الأسطول'}</span>
          </h1>
          <p className="text-sm sm:text-base mt-4 max-w-2xl mx-auto" style={{ color: 'var(--color-muted)' }}>
            {lang === 'fr'
              ? "Tous les véhicules de toutes nos agences partenaires. Filtrez par agence pour ne voir qu'une seule enseigne."
              : 'جميع سيارات كل وكالاتنا الشريكة. صفِّ حسب الوكالة لعرض علامة واحدة فقط.'}
          </p>
        </motion.div>

        {/* ── Filtre d'agence ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-strong rounded-2xl p-5 mb-5"
        >
          <AgencyFilter variant="full" />
        </motion.div>

        {/* ── Recherche, tri, filtres ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="glass-strong rounded-2xl p-4 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-muted)' }}
              />
              <input
                type="search"
                className="field pl-10"
                placeholder={lang === 'fr' ? 'Marque, modèle, agence…' : 'العلامة، الطراز، الوكالة…'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label={lang === 'fr' ? 'Rechercher un véhicule' : 'ابحث عن سيارة'}
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-muted)' }}
                  aria-label={lang === 'fr' ? 'Effacer' : 'مسح'}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1 lg:flex-none lg:w-52">
                <ArrowUpDown
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-muted)' }}
                />
                <select
                  className="field pl-9"
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  aria-label={lang === 'fr' ? 'Trier' : 'ترتيب'}
                >
                  <option value="price-asc">{lang === 'fr' ? 'Prix croissant' : 'السعر تصاعدي'}</option>
                  <option value="price-desc">{lang === 'fr' ? 'Prix décroissant' : 'السعر تنازلي'}</option>
                  <option value="brand">{lang === 'fr' ? 'Marque (A→Z)' : 'العلامة'}</option>
                  <option value="recent">{lang === 'fr' ? 'Plus récents' : 'الأحدث'}</option>
                </select>
              </div>

              <button
                onClick={() => setShowFilters(v => !v)}
                className="btn-ghost h-[46px] px-4 text-xs relative shrink-0"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal size={15} />
                <span className="hidden sm:inline">{lang === 'fr' ? 'Filtres' : 'مرشحات'}</span>
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center"
                    style={{ background: 'var(--color-iris)' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid var(--color-line-soft)' }}>
                  <div>
                    <label className="label" htmlFor="filter-energy">
                      <Fuel size={12} style={{ color: 'var(--color-iris)' }} />
                      {lang === 'fr' ? 'Énergie' : 'الوقود'}
                    </label>
                    <select id="filter-energy" className="field" value={energy} onChange={e => setEnergy(e.target.value)}>
                      <option value="">{lang === 'fr' ? 'Toutes' : 'الكل'}</option>
                      {energies.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="filter-transmission">
                      <Cog size={12} style={{ color: 'var(--color-iris)' }} />
                      {lang === 'fr' ? 'Boîte de vitesses' : 'ناقل الحركة'}
                    </label>
                    <select
                      id="filter-transmission"
                      className="field"
                      value={transmission}
                      onChange={e => setTransmission(e.target.value)}
                    >
                      <option value="">{lang === 'fr' ? 'Toutes' : 'الكل'}</option>
                      {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button onClick={clearFilters} disabled={activeFilterCount === 0} className="btn-ghost w-full h-[46px] text-xs">
                      <X size={14} /> {lang === 'fr' ? 'Réinitialiser' : 'إعادة تعيين'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {loadError && <div className="mb-8"><ErrorBanner message={loadError} onRetry={reload} /></div>}

        {/* ── Compteur ── */}
        {!isLoading && (
          <p className="text-xs mb-5 font-medium flex flex-wrap items-center gap-2" style={{ color: 'var(--color-muted)' }}>
            <span>
              <strong style={{ color: 'var(--color-title)' }}>{visible.length}</strong>{' '}
              {lang === 'fr'
                ? `véhicule${visible.length > 1 ? 's' : ''} ${agencyFilter ? 'dans cette agence' : 'toutes agences confondues'}`
                : 'سيارة'}
            </span>
            {/* Les agences répondent l'une après l'autre : on le dit plutôt que
                de laisser croire que la liste est complète. */}
            {isSyncing && (
              <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-aqua)' }}>
                <Loader2 size={11} className="animate-spin" />
                {lang === 'fr' ? 'autres agences en cours…' : 'وكالات أخرى قيد التحميل…'}
              </span>
            )}
          </p>
        )}

        {/* ── Grille ── */}
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {isLoading
            ? Array.from({ length: 12 }, (_, i) => <CarCardSkeleton key={i} index={i} />)
            : visible.map((car, i) => (
                <CarCard
                  key={`${car.agencyKey}-${car.id}`}
                  car={car}
                  offer={currentOfferForCar(car.id, specialOffers)}
                  lang={lang}
                  index={i}
                  onOpen={setDetailCar}
                  onBook={openBooking}
                  hideAgency={!!agencyFilter}
                />
              ))}
        </div>

        {!isLoading && visible.length === 0 && (
          <EmptyState
            icon={CarIcon}
            title={lang === 'fr' ? 'Aucun véhicule ne correspond' : 'لا توجد سيارة مطابقة'}
            description={
              lang === 'fr'
                ? 'Élargissez votre recherche ou retirez les filtres actifs.'
                : 'وسّع بحثك أو أزل المرشحات النشطة.'
            }
            action={
              activeFilterCount > 0 ? (
                <button onClick={clearFilters} className="btn-ghost h-11 px-5 text-xs mt-2">
                  <X size={14} /> {lang === 'fr' ? 'Réinitialiser les filtres' : 'إعادة تعيين المرشحات'}
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      <AnimatePresence>
        {detailCar && (
          <CarDetailsModal
            car={detailCar}
            offer={currentOfferForCar(detailCar.id, specialOffers)}
            lang={lang}
            onClose={() => setDetailCar(null)}
            onBook={car => { setDetailCar(null); openBooking(car); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
