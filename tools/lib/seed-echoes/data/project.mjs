export function buildSeedProject(timestamp) {
  return {
    id: '8c1d9d74-9d59-4d05-a6ab-111111111111',
    title: 'Echoes of the Mushroom Realm',
    slug: 'echoes-of-the-mushroom-realm',
    status: 'planning',
    source_prompt: [
      'Create a high-definition 2D mobile-friendly action exploration game called Echoes of the Mushroom Realm.',
      'The player wakes under the Origin Tree, crosses fungal ruins, tests ancient weapons, and leaves toward a darker realm.',
      'The visual target is painterly dark fantasy with glowing spores, giant mushrooms, ruined stone platforms, and strong readability on mobile.',
      'Keep the hooded hero silhouette, the red cloak identity, modular level construction, and an atmosphere close to the supplied concept boards.',
    ].join(' '),
    summary: 'Dark fantasy 2D action-exploration slice with hero, fungal enemies, modular map, and strong concept-art fidelity.',
    genre: 'platformer',
    dimension: '2d',
    target_runtime: 'ellipse_web_2d',
    camera_mode: 'side_view',
    source_images: [],
    metadata: {},
    created_at: timestamp,
    updated_at: timestamp,
  };
}
