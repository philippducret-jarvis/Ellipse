/**
 * CLIPS PROCÉDURAUX v2 — animations squelettales denses (anti-pantin),
 * retargetables sur tout rig humanoïde / monopart.
 *
 * Principes d'animation appliqués (les 12 principes, version jeu) :
 *   - ANTICIPATION : recul avant l'attaque, accroupi avant le saut ;
 *   - SQUASH & STRETCH : compression à l'impact, étirement en l'air (root sx/sy) ;
 *   - FOLLOW-THROUGH : la pose déborde puis revient (overshoot des keyframes) ;
 *   - ARCS : les membres décrivent des courbes, pas des allers-retours secs.
 *
 * `rot` en degrés, `dx/dy` en fractions de la hauteur du rig, `sx/sy` échelles.
 * Le runtime interpole (easing cosine) et FOND les poses entre clips (blend).
 */

const K = (t, v) => ({ t, ...v });

export function humanoidClips() {
  return {
    version: 'forge-clips-2',
    clips: {
      idle: {
        duration: 2.2, loop: true,
        tracks: {
          root:     [K(0, { dy: 0, sx: 1, sy: 1 }), K(0.5, { dy: -0.010, sx: 1.01, sy: 0.99 }), K(1, { dy: 0, sx: 1, sy: 1 })],
          torso:    [K(0, { rot: 0 }), K(0.35, { rot: 1.8 }), K(0.6, { rot: 1.2 }), K(1, { rot: 0 })],
          head:     [K(0, { rot: 0 }), K(0.45, { rot: -2.5 }), K(0.7, { rot: -1 }), K(1, { rot: 0 })],
          armNear:  [K(0, { rot: 2 }), K(0.5, { rot: -4 }), K(1, { rot: 2 })],
          armFar:   [K(0, { rot: -2 }), K(0.5, { rot: 4 }), K(1, { rot: -2 })],
          thighNear: [K(0, { rot: -1 }), K(0.5, { rot: 1 }), K(1, { rot: -1 })],
        },
      },
      run: {
        duration: 0.52, loop: true,
        tracks: {
          root: [
            K(0, { dy: -0.004, sy: 1.0 }), K(0.12, { dy: -0.022, sy: 1.03 }), K(0.25, { dy: -0.006, sy: 0.985 }),
            K(0.5, { dy: -0.004, sy: 1.0 }), K(0.62, { dy: -0.022, sy: 1.03 }), K(0.75, { dy: -0.006, sy: 0.985 }), K(1, { dy: -0.004, sy: 1.0 }),
          ],
          torso: [K(0, { rot: 8 }), K(0.25, { rot: 10 }), K(0.5, { rot: 8 }), K(0.75, { rot: 10 }), K(1, { rot: 8 })],
          head:  [K(0, { rot: -4 }), K(0.25, { rot: -6 }), K(0.5, { rot: -4 }), K(0.75, { rot: -6 }), K(1, { rot: -4 })],
          thighNear: [K(0, { rot: -38 }), K(0.2, { rot: -18 }), K(0.5, { rot: 34 }), K(0.8, { rot: 2 }), K(1, { rot: -38 })],
          shinNear:  [K(0, { rot: 18 }), K(0.15, { rot: 52 }), K(0.35, { rot: 68 }), K(0.5, { rot: 8 }), K(0.75, { rot: 14 }), K(1, { rot: 18 })],
          thighFar:  [K(0, { rot: 34 }), K(0.3, { rot: 2 }), K(0.5, { rot: -38 }), K(0.7, { rot: -18 }), K(1, { rot: 34 })],
          shinFar:   [K(0, { rot: 8 }), K(0.25, { rot: 14 }), K(0.5, { rot: 18 }), K(0.65, { rot: 52 }), K(0.85, { rot: 68 }), K(1, { rot: 8 })],
          armNear:   [K(0, { rot: 34 }), K(0.25, { rot: 8 }), K(0.5, { rot: -34 }), K(0.75, { rot: -6 }), K(1, { rot: 34 })],
          armFar:    [K(0, { rot: -34 }), K(0.25, { rot: -6 }), K(0.5, { rot: 34 }), K(0.75, { rot: 8 }), K(1, { rot: -34 })],
        },
      },
      attack: {
        duration: 0.42, loop: false,
        tracks: {
          // anticipation (recul 0→0.22) → frappe (0.22→0.42) → overshoot → retour
          root:    [K(0, { dx: 0, sx: 1 }), K(0.2, { dx: -0.018, sx: 0.97 }), K(0.4, { dx: 0.035, sx: 1.05 }), K(0.6, { dx: 0.02, sx: 1 }), K(1, { dx: 0 })],
          torso:   [K(0, { rot: -2 }), K(0.2, { rot: -14 }), K(0.42, { rot: 18 }), K(0.6, { rot: 12 }), K(1, { rot: 0 })],
          armNear: [K(0, { rot: 0 }), K(0.22, { rot: -110 }), K(0.4, { rot: 62 }), K(0.55, { rot: 74 }), K(0.75, { rot: 40 }), K(1, { rot: 2 })],
          armFar:  [K(0, { rot: 0 }), K(0.22, { rot: 22 }), K(0.42, { rot: -30 }), K(1, { rot: -2 })],
          head:    [K(0, { rot: 0 }), K(0.2, { rot: 6 }), K(0.42, { rot: -8 }), K(1, { rot: 0 })],
          thighNear: [K(0, { rot: 0 }), K(0.2, { rot: -8 }), K(0.42, { rot: 10 }), K(1, { rot: 0 })],
        },
      },
      hit: {
        duration: 0.32, loop: false,
        tracks: {
          root:  [K(0, { dx: 0, sx: 1 }), K(0.25, { dx: -0.04, sx: 0.92, sy: 1.05 }), K(0.6, { dx: -0.01, sx: 1.02 }), K(1, { dx: 0, sx: 1, sy: 1 })],
          torso: [K(0, { rot: 0 }), K(0.25, { rot: -16 }), K(0.6, { rot: 4 }), K(1, { rot: 0 })],
          head:  [K(0, { rot: 0 }), K(0.22, { rot: -14 }), K(0.6, { rot: 3 }), K(1, { rot: 0 })],
          armNear: [K(0, { rot: 0 }), K(0.25, { rot: 24 }), K(1, { rot: 0 })],
          armFar:  [K(0, { rot: 0 }), K(0.25, { rot: -20 }), K(1, { rot: 0 })],
        },
      },
      jump: {
        duration: 0.55, loop: false,
        tracks: {
          // accroupi (anticipation) → extension (stretch) → groupé en l'air
          root: [K(0, { sy: 0.94, sx: 1.04 }), K(0.18, { sy: 1.08, sx: 0.96 }), K(0.5, { sy: 1.0, sx: 1.0 }), K(1, { sy: 1 })],
          thighNear: [K(0, { rot: -18 }), K(0.15, { rot: 8 }), K(0.45, { rot: -62 }), K(1, { rot: -20 })],
          shinNear:  [K(0, { rot: 24 }), K(0.15, { rot: 4 }), K(0.45, { rot: 78 }), K(1, { rot: 26 })],
          thighFar:  [K(0, { rot: -14 }), K(0.15, { rot: 12 }), K(0.45, { rot: -40 }), K(1, { rot: 4 })],
          shinFar:   [K(0, { rot: 20 }), K(0.15, { rot: 6 }), K(0.45, { rot: 64 }), K(1, { rot: 18 })],
          armNear:   [K(0, { rot: 12 }), K(0.2, { rot: -52 }), K(0.5, { rot: -38 }), K(1, { rot: 0 })],
          armFar:    [K(0, { rot: 8 }), K(0.2, { rot: -44 }), K(0.5, { rot: -30 }), K(1, { rot: 0 })],
          torso:     [K(0, { rot: 6 }), K(0.2, { rot: -4 }), K(0.5, { rot: 10 }), K(1, { rot: 0 })],
        },
      },
      land: {
        duration: 0.22, loop: false,
        tracks: {
          root:  [K(0, { sy: 0.85, sx: 1.12, dy: 0 }), K(0.5, { sy: 1.04, sx: 0.98 }), K(1, { sy: 1, sx: 1 })],
          torso: [K(0, { rot: 14 }), K(0.5, { rot: -3 }), K(1, { rot: 0 })],
          thighNear: [K(0, { rot: -28 }), K(1, { rot: 0 })],
          shinNear:  [K(0, { rot: 36 }), K(1, { rot: 0 })],
          armNear:   [K(0, { rot: 20 }), K(1, { rot: 2 })],
          armFar:    [K(0, { rot: -18 }), K(1, { rot: -2 })],
        },
      },
      death: {
        duration: 0.9, loop: false,
        tracks: {
          root:  [K(0, { rot: 0, dy: 0, sx: 1 }), K(0.3, { rot: -30, dy: -0.02, sx: 1.02 }), K(0.65, { rot: -82, dy: 0.045 }), K(1, { rot: -90, dy: 0.055 })],
          armNear: [K(0, { rot: 0 }), K(0.4, { rot: 60 }), K(1, { rot: 50 })],
          armFar:  [K(0, { rot: 0 }), K(0.4, { rot: -55 }), K(1, { rot: -45 })],
          head:    [K(0, { rot: 0 }), K(0.5, { rot: -18 }), K(1, { rot: -22 })],
        },
      },
    },
  };
}

export function monopartClips() {
  return {
    version: 'forge-clips-2',
    clips: {
      idle: {
        duration: 1.6, loop: true,
        tracks: {
          root: [K(0, { dy: 0 }), K(0.5, { dy: -0.006 }), K(1, { dy: 0 })],
          body: [K(0, { sy: 1, sx: 1, rot: 0 }), K(0.5, { sy: 0.95, sx: 1.04, rot: 1.5 }), K(1, { sy: 1, sx: 1, rot: 0 })],
        },
      },
      run: {
        duration: 0.48, loop: true,
        tracks: {
          root: [K(0, { dy: 0 }), K(0.25, { dy: -0.035 }), K(0.5, { dy: 0 }), K(0.75, { dy: -0.035 }), K(1, { dy: 0 })],
          body: [
            K(0, { rot: -6, sy: 0.96, sx: 1.05 }), K(0.25, { rot: 0, sy: 1.06, sx: 0.96 }),
            K(0.5, { rot: 6, sy: 0.96, sx: 1.05 }), K(0.75, { rot: 0, sy: 1.06, sx: 0.96 }), K(1, { rot: -6, sy: 0.96, sx: 1.05 }),
          ],
        },
      },
      attack: {
        duration: 0.45, loop: false,
        tracks: {
          root: [K(0, { dx: 0 }), K(0.25, { dx: -0.045 }), K(0.5, { dx: 0.08 }), K(0.7, { dx: 0.04 }), K(1, { dx: 0 })],
          body: [
            K(0, { sx: 1, rot: 0 }), K(0.25, { sx: 0.85, sy: 1.12, rot: -8 }),
            K(0.5, { sx: 1.18, sy: 0.9, rot: 10 }), K(0.7, { sx: 1.05, sy: 0.98 }), K(1, { sx: 1, sy: 1, rot: 0 }),
          ],
        },
      },
      hit: {
        duration: 0.28, loop: false,
        tracks: { body: [K(0, { sx: 1 }), K(0.3, { sx: 1.2, sy: 0.8, rot: -6 }), K(0.7, { sx: 0.95, sy: 1.04 }), K(1, { sx: 1, sy: 1, rot: 0 })] },
      },
      death: {
        duration: 0.7, loop: false,
        tracks: {
          body: [K(0, { sy: 1, rot: 0 }), K(0.4, { sy: 0.6, sx: 1.15, rot: 6 }), K(1, { sy: 0.1, sx: 1.35, rot: 10 })],
          root: [K(0, { dy: 0 }), K(1, { dy: 0.025 })],
        },
      },
    },
  };
}

export function clipsFor(rigType) {
  return rigType === 'monopart' ? monopartClips() : humanoidClips();
}
