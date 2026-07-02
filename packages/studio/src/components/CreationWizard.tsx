import { startTransition, useMemo, useState } from 'react';
import {
  GAME_TYPES,
  ART_STYLES,
  MECHANIC_MODULES,
  derivePreset,
  resolveLibraryPlan,
  assessLibraryReadiness,
  type GameDimension,
  type ArtStyle,
  type DifficultyBand,
} from '@ellipse/shared';
import { useStudioStore } from '../store/studio-store.js';
import { createGameProject, fetchAutonomousProductionStatus, fetchGameProjects, uploadPhoto } from '../api/client.js';

const FAMILY_LABELS: Record<string, string> = {
  action: 'Action / Plateforme',
  shooter: 'Tir',
  rpg: 'RPG / Aventure',
  strategy: 'Stratégie / Cartes',
  puzzle: 'Réflexion',
  narrative: 'Narration',
  simulation: 'Simulation / Gestion',
  arcade: 'Arcade',
};

const MOODS = [
  { value: 'mignon', label: 'Mignon' },
  { value: 'dark', label: 'Sombre' },
  { value: 'epic', label: 'Épique' },
  { value: 'retro', label: 'Rétro' },
  { value: 'mysterious', label: 'Mystérieux' },
];
const DIFFICULTIES: { value: DifficultyBand; label: string }[] = [
  { value: 'casual', label: 'Détente' },
  { value: 'standard', label: 'Standard' },
  { value: 'hardcore', label: 'Exigeant' },
  { value: 'souls', label: 'Souls' },
];

export function CreationWizard() {
  const setOpen = useStudioStore((s) => s.setWizardOpen);
  const setProjects = useStudioStore((s) => s.setProjects);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const setWorkspaceTab = useStudioStore((s) => s.setWorkspaceTab);
  const setActiveSnapshot = useStudioStore((s) => s.setActiveSnapshot);

  const [gameTypeId, setGameTypeId] = useState('platformer');
  const gameType = useMemo(() => GAME_TYPES.find((t) => t.id === gameTypeId)!, [gameTypeId]);

  const [dimension, setDimension] = useState<GameDimension>('2d');
  const [artStyle, setArtStyle] = useState<ArtStyle>('pixel');
  const [mood, setMood] = useState('epic');
  const [difficulty, setDifficulty] = useState<DifficultyBand>('standard');
  const [platforms, setPlatforms] = useState<string[]>(['web']);
  const [modules, setModules] = useState<string[]>(gameType.suggested_modules ?? []);
  const [title, setTitle] = useState('');
  const [concept, setConcept] = useState('');
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [autonomousHd, setAutonomousHd] = useState(true);
  const [busy, setBusy] = useState(false);
  const [productionHint, setProductionHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quand on change de type, réaligner dimension/style sur ses défauts.
  function pickType(id: string) {
    const t = GAME_TYPES.find((x) => x.id === id)!;
    setGameTypeId(id);
    setDimension(t.dimensions[0]!);
    setArtStyle(t.default_art_styles[0]!);
    setDifficulty(t.difficulty_band);
    setModules(t.suggested_modules ?? []);
  }

  // Modules compatibles : suggérés du type ∪ modules de la même famille.
  const availableModules = useMemo(() => {
    const ids = new Set([...(gameType.suggested_modules ?? []), ...MECHANIC_MODULES.filter((m) => m.suits_families.includes(gameType.family)).map((m) => m.id)]);
    return MECHANIC_MODULES.filter((m) => ids.has(m.id));
  }, [gameType]);

  function toggleModule(id: string) {
    setModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const preset = useMemo(
    () => derivePreset({ game_type: gameTypeId, dimension, art_style: artStyle, mood, difficulty, platforms, mechanic_modules: modules }),
    [gameTypeId, dimension, artStyle, mood, difficulty, platforms, modules],
  );
  const readiness = useMemo(() => assessLibraryReadiness(resolveLibraryPlan(preset)), [preset]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof GAME_TYPES>();
    for (const t of GAME_TYPES) {
      const arr = map.get(t.family) ?? [];
      arr.push(t);
      map.set(t.family, arr);
    }
    return [...map.entries()];
  }, []);

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    try {
      const r = await uploadPhoto(file);
      setUploaded((prev) => [...prev, r.url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload échoué');
    }
  }

  async function pollAutonomousStatus(projectId: string) {
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const st = await fetchAutonomousProductionStatus(projectId);
        if (st.status === 'idle') {
          setProductionHint(null);
          const refreshed = await fetchGameProjects();
          setProjects(refreshed);
          return;
        }
      } catch {
        /* orchestrator peut redémarrer */
      }
    }
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const presetLine =
        `[Ellipse preset] type=${preset.game_type} dimension=${preset.dimension} ` +
        `perspective=${preset.perspective} style=${preset.art_style} mood=${mood} ` +
        `difficulty=${preset.difficulty} modules=${preset.mechanic_modules.join(',')} ` +
        `systems=${preset.systems.join(',')} ` +
        `map=${preset.map_kind} audio=${preset.audio_profile} platforms=${preset.platforms.join(',')}`;
      const prompt = [concept.trim(), presetLine].filter(Boolean).join('\n\n');
      const snap = await createGameProject({
        title: title.trim() || gameType.label,
        prompt,
        images: uploaded,
        autostart: autonomousHd,
        autonomous: autonomousHd,
      });
      const refreshed = await fetchGameProjects();
      startTransition(() => {
        setProjects(refreshed);
        setActiveProject(snap.project.id);
        setActiveSnapshot(snap);
        setWorkspaceTab(autonomousHd ? 'production' : 'extraction');
      });
      if (autonomousHd) {
        setProductionHint('Production autonome HD lancée — GDL, assets, playtest et preview en cours…');
        void pollAutonomousStatus(snap.project.id);
      }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création échouée');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal-panel wizard-panel">
        <div className="modal-head">
          <h2>✨ Assistant de création — tous genres</h2>
          <button className="modal-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
        </div>

        <div className="modal-body wizard-body">
          {/* 1. Type de jeu */}
          <section>
            <div className="form-label">1 · Type de jeu</div>
            {grouped.map(([family, types]) => (
              <div key={family} className="wizard-family">
                <div className="wizard-family-label">{FAMILY_LABELS[family] ?? family}</div>
                <div className="wizard-type-grid">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      className={`wizard-type ${t.id === gameTypeId ? 'active' : ''}`}
                      onClick={() => pickType(t.id)}
                      title={t.core_loops.join(' · ')}
                    >
                      {t.label}
                      {t.difficulty_band === 'souls' ? <span className="chip chip-sm chip-error">souls</span> : null}
                      <span className="chip chip-sm chip-muted">P{t.phase}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* 2. Options */}
          <section className="wizard-options">
            <div className="form-field">
              <span className="form-label">2 · Dimension</span>
              <select className="text-input select-sm" value={dimension} onChange={(e) => setDimension(e.target.value as GameDimension)}>
                {gameType.dimensions.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-field">
              <span className="form-label">Style</span>
              <select className="text-input select-sm" value={artStyle} onChange={(e) => setArtStyle(e.target.value as ArtStyle)}>
                {ART_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <span className="form-label">Ambiance</span>
              <select className="text-input select-sm" value={mood} onChange={(e) => setMood(e.target.value)}>
                {MOODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <span className="form-label">Difficulté</span>
              <select className="text-input select-sm" value={difficulty} onChange={(e) => setDifficulty(e.target.value as DifficultyBand)}>
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </section>

          <section>
            <div className="form-label">3 · Plateformes</div>
            <div className="wizard-chips">
              {['web', 'mobile', 'desktop'].map((p) => (
                <button key={p} className={`chip ${platforms.includes(p) ? 'chip-success' : 'chip-muted'}`} onClick={() => togglePlatform(p)}>
                  {p}
                </button>
              ))}
            </div>
          </section>

          {/* Modules de mécaniques (gacha, invocation, tetris…) */}
          {availableModules.length > 0 && (
            <section>
              <div className="form-label">4 · Mécaniques <span className="form-hint">(spécifiques au type)</span></div>
              <div className="wizard-modules">
                {availableModules.map((m) => (
                  <button
                    key={m.id}
                    className={`wizard-module ${modules.includes(m.id) ? 'active' : ''}`}
                    onClick={() => toggleModule(m.id)}
                    title={m.description}
                  >
                    <strong>{m.label}</strong>
                    <span className="wizard-module-desc">{m.description}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {gameType.reference_games && gameType.reference_games.length > 0 && (
            <section>
              <div className="form-hint">Inspiré des meilleurs : {gameType.reference_games.join(' · ')}</div>
            </section>
          )}

          {/* 4. Détails */}
          <section>
            <label className="form-label">4 · Nom <span className="form-hint">(optionnel)</span>
              <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={gameType.label} />
            </label>
            <label className="form-label">Concept <span className="form-hint">(optionnel — affine la génération)</span>
              <textarea className="text-input textarea" rows={3} value={concept} onChange={(e) => setConcept(e.target.value)}
                placeholder="Héros, boucle de jeu, ennemis, ton…" />
            </label>
            <div className="form-label">Références <span className="form-hint">(optionnel — découpe CV)</span>
              <label className="upload-trigger upload-trigger-sm">
                + Ajouter une image
                <input type="file" accept="image/*" onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)} />
              </label>
              {uploaded.length > 0 && <span className="form-hint"> {uploaded.length} image(s)</span>}
            </div>
          </section>

          {/* Production autonome */}
          <section className="wizard-options">
            <label className="form-field checkbox-row">
              <input
                type="checkbox"
                checked={autonomousHd}
                onChange={(e) => setAutonomousHd(e.target.checked)}
              />
              <span className="form-label">Production autonome HD (prompt/image → jeu complet)</span>
            </label>
            <p className="form-hint">GDL, narrative, audio, assets, playtest et preview HTML5. Jeu livrable de référence : <strong>Veloria — Veille des Lames</strong> (<code>pnpm deliver:veloria</code>).</p>
          </section>

          {/* Résumé du preset */}
          <section className="wizard-summary">
            <div className="form-label">Aperçu de production</div>
            <div className="wizard-summary-grid">
              <span className="chip chip-sm">carte: {preset.map_kind}</span>
              <span className="chip chip-sm">audio: {preset.audio_profile}</span>
              <span className="chip chip-sm">{readiness.systems_ready}/{readiness.systems_total} systèmes prêts</span>
              <span className="chip chip-sm">{readiness.assets_ready}/{readiness.assets_total} familles d'assets</span>
              <span className={`chip chip-sm ${readiness.map_ready ? 'chip-success' : 'chip-muted'}`}>
                carte {readiness.map_ready ? 'générable' : 'à venir'}
              </span>
            </div>
            <div className="wizard-systems">{preset.systems.join(' · ')}</div>
          </section>

          {productionHint && <p className="form-hint">{productionHint}</p>}
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
          <button className="btn-primary" disabled={busy} onClick={() => void handleCreate()}>
            {busy ? 'Création…' : `Créer ${gameType.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
