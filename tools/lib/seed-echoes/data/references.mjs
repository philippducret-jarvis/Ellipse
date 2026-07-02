import { resolveDownloadPath } from '../io.mjs';

export function buildReferencePlan() {
  return [
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/ChatGPT Image 27 mai 2026, 15_13_36.png'),
      target: 'hero_echo_front.png',
      role: 'hero_primary',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/ChatGPT Image 27 mai 2026, 13_28_01.png'),
      target: 'cast_exploration_sheet.png',
      role: 'cast_sheet',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/A0A01D85-008A-4331-B9EB-2613F7B071E1.jpeg'),
      target: 'menu_keyart.jpeg',
      role: 'menu_keyart',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/ChatGPT Image 26 mai 2026, 21_19_18.png'),
      target: 'world_map_board.png',
      role: 'world_map',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/8c36afeb-7533-4b55-9e74-1c7276fe87a1.png'),
      target: 'boss_guardian_board.png',
      role: 'boss_board',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/8189dfb6-17a3-4faa-ac00-72f9b0d75d48.png'),
      target: 'enemy_family_board.png',
      role: 'enemy_board',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/c65e4ffe-6755-4cae-8530-ddfae1908a58.png'),
      target: 'sporeling_detail_board.png',
      role: 'enemy_detail',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/7b7b68b5-ad32-4c44-ac36-dc9507c61b70.png'),
      target: 'tutorial_overview_board.png',
      role: 'tutorial_overview',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/59dd7135-0d68-47d5-9fa6-50f480cb551a.png'),
      target: 'level_test_01_board.png',
      role: 'level_primary',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/ebd5d1cf-364d-4626-971d-d5eacfc4fa76.png'),
      target: 'level_test_01_alt_board.png',
      role: 'level_secondary',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/c107e72c-ad1b-4bf1-80ea-55328ff0c50b.png'),
      target: 'sporale_cliffs_board.png',
      role: 'modular_level',
    },
    {
      source: resolveDownloadPath('C:/Users/phili/Downloads/Echoes of the mushroom realm/ChatGPT Image 26 mai 2026, 21_11_11.png'),
      target: 'main_cast_board.png',
      role: 'character_sheet',
    },
  ];
}
