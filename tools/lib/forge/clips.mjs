/**
 * CLIPS PROCÉDURAUX — bibliothèque d'animations squelettales, retargetable
 * sur tout rig humanoïde (et variante monopart pour créatures).
 *
 * Format : par clip, des pistes de keyframes par os. `rot` en degrés,
 * `dx`/`dy` en fractions de la hauteur du rig (indépendant de la résolution),
 * `sx`/`sy` échelles (squash/stretch). Le runtime interpole (easing cosine).
 * `t` est normalisé 0..1 sur la durée du clip.
 */

const K = (t, v) => ({ t, ...v });

export function humanoidClips() {
  return {
    version: 'forge-clips-1',
    clips: {
      idle: {
        duration: 1.8, loop: true,
        tracks: {
          root:     [K(0, { dy: 0 }), K(0.5, { dy: -0.008 }), K(1, { dy: 0 })],
          torso:    [K(0, { rot: 0 }), K(0.5, { rot: 1.5 }), K(1, { rot: 0 })],
          head:     [K(0, { rot: 0 }), K(0.55, { rot: -2 }), K(1, { rot: 0 })],
          armNear:  [K(0, { rot: 2 }), K(0.5, { rot: -3 }), K(1, { rot: 2 })],
          armFar:   [K(0, { rot: -2 }), K(0.5, { rot: 3 }), K(1, { rot: -2 })],
        },
      },
      run: {
        duration: 0.55, loop: true,
        tracks: {
          root:      [K(0, { dy: 0 }), K(0.25, { dy: -0.015 }), K(0.5, { dy: 0 }), K(0.75, { dy: -0.015 }), K(1, { dy: 0 })],
          torso:     [K(0, { rot: 6 }), K(1, { rot: 6 })],
          head:      [K(0, { rot: -3 }), K(1, { rot: -3 })],
          thighNear: [K(0, { rot: -32 }), K(0.5, { rot: 30 }), K(1, { rot: -32 })],
          shinNear:  [K(0, { rot: 25 }), K(0.25, { rot: 45 }), K(0.5, { rot: 5 }), K(0.75, { rot: 20 }), K(1, { rot: 25 })],
          thighFar:  [K(0, { rot: 30 }), K(0.5, { rot: -32 }), K(1, { rot: 30 })],
          shinFar:   [K(0, { rot: 5 }), K(0.25, { rot: 20 }), K(0.5, { rot: 25 }), K(0.75, { rot: 45 }), K(1, { rot: 5 })],
          armNear:   [K(0, { rot: 28 }), K(0.5, { rot: -30 }), K(1, { rot: 28 })],
          armFar:    [K(0, { rot: -30 }), K(0.5, { rot: 28 }), K(1, { rot: -30 })],
        },
      },
      attack: {
        duration: 0.38, loop: false,
        tracks: {
          root:    [K(0, { dx: 0 }), K(0.35, { dx: 0.02 }), K(1, { dx: 0 })],
          torso:   [K(0, { rot: -4 }), K(0.35, { rot: 14 }), K(1, { rot: 0 })],
          armNear: [K(0, { rot: -95 }), K(0.3, { rot: 55 }), K(0.55, { rot: 65 }), K(1, { rot: 2 })],
          armFar:  [K(0, { rot: 10 }), K(0.35, { rot: -25 }), K(1, { rot: -2 })],
          head:    [K(0, { rot: 3 }), K(0.35, { rot: -5 }), K(1, { rot: 0 })],
        },
      },
      hit: {
        duration: 0.28, loop: false,
        tracks: {
          root:  [K(0, { dx: 0 }), K(0.3, { dx: -0.03 }), K(1, { dx: 0 })],
          torso: [K(0, { rot: 0 }), K(0.3, { rot: -12 }), K(1, { rot: 0 })],
          head:  [K(0, { rot: 0 }), K(0.3, { rot: -10 }), K(1, { rot: 0 })],
        },
      },
      jump: {
        duration: 0.5, loop: false,
        tracks: {
          thighNear: [K(0, { rot: -10 }), K(0.4, { rot: -55 }), K(1, { rot: -15 })],
          shinNear:  [K(0, { rot: 15 }), K(0.4, { rot: 70 }), K(1, { rot: 20 })],
          thighFar:  [K(0, { rot: 10 }), K(0.4, { rot: -35 }), K(1, { rot: 5 })],
          shinFar:   [K(0, { rot: 10 }), K(0.4, { rot: 60 }), K(1, { rot: 15 })],
          armNear:   [K(0, { rot: 5 }), K(0.4, { rot: -40 }), K(1, { rot: 0 })],
          armFar:    [K(0, { rot: -5 }), K(0.4, { rot: -35 }), K(1, { rot: 0 })],
          torso:     [K(0, { rot: 2 }), K(0.4, { rot: 8 }), K(1, { rot: 0 })],
        },
      },
      death: {
        duration: 0.7, loop: false,
        tracks: {
          root:  [K(0, { rot: 0, dy: 0 }), K(0.6, { rot: -80, dy: 0.04 }), K(1, { rot: -88, dy: 0.05 })],
          armNear: [K(0, { rot: 0 }), K(0.6, { rot: 45 }), K(1, { rot: 50 })],
          armFar:  [K(0, { rot: 0 }), K(0.6, { rot: -40 }), K(1, { rot: -45 })],
        },
      },
    },
  };
}

export function monopartClips() {
  return {
    version: 'forge-clips-1',
    clips: {
      idle: {
        duration: 1.4, loop: true,
        tracks: { body: [K(0, { sy: 1, sx: 1 }), K(0.5, { sy: 0.96, sx: 1.03 }), K(1, { sy: 1, sx: 1 })] },
      },
      run: {
        duration: 0.5, loop: true,
        tracks: {
          root: [K(0, { dy: 0 }), K(0.5, { dy: -0.03 }), K(1, { dy: 0 })],
          body: [K(0, { rot: -4, sy: 1 }), K(0.5, { rot: 4, sy: 1.04 }), K(1, { rot: -4, sy: 1 })],
        },
      },
      attack: {
        duration: 0.4, loop: false,
        tracks: {
          root: [K(0, { dx: 0 }), K(0.2, { dx: -0.03 }), K(0.5, { dx: 0.06 }), K(1, { dx: 0 })],
          body: [K(0, { sx: 1 }), K(0.2, { sx: 0.9, sy: 1.08 }), K(0.5, { sx: 1.12, sy: 0.94 }), K(1, { sx: 1, sy: 1 })],
        },
      },
      hit: {
        duration: 0.25, loop: false,
        tracks: { body: [K(0, { sx: 1 }), K(0.3, { sx: 1.15, sy: 0.85 }), K(1, { sx: 1, sy: 1 })] },
      },
      death: {
        duration: 0.6, loop: false,
        tracks: { body: [K(0, { sy: 1, rot: 0 }), K(1, { sy: 0.12, sx: 1.3, rot: 8 })], root: [K(0, { dy: 0 }), K(1, { dy: 0.02 })] },
      },
    },
  };
}

export function clipsFor(rigType) {
  return rigType === 'monopart' ? monopartClips() : humanoidClips();
}
