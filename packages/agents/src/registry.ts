import type { Agent, AgentRegistry } from './types.js';
import { CharacterAgent } from './agents/character-agent.js';
import { DecorAgent } from './agents/decor-agent.js';
import { AnimationAgent } from './agents/animation-agent.js';
import { LevelAgent } from './agents/level-agent.js';
import { Mesh3DAgent } from './agents/mesh-3d-agent.js';
import { LightingAgent } from './agents/lighting-agent.js';
import { CameraAgent } from './agents/camera-agent.js';
import { GameplayAgent } from './agents/gameplay-agent.js';
import { NarrativeAgent } from './agents/narrative-agent.js';
import { MusicAgent } from './agents/music-agent.js';
import { SfxAgent } from './agents/sfx-agent.js';
import { UIAgent } from './agents/ui-agent.js';
import { VfxAgent } from './agents/vfx-agent.js';
import { QAAgent } from './agents/qa-agent.js';
import { IntegrationAgent } from './agents/integration-agent.js';

class Registry implements AgentRegistry {
  private agents = new Map<string, Agent>();

  register(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  list(): Agent[] {
    return [...this.agents.values()];
  }
}

let singleton: AgentRegistry | null = null;

export function createAgentRegistry(): AgentRegistry {
  const registry = new Registry();
  registry.register(new CharacterAgent());
  registry.register(new DecorAgent());
  registry.register(new AnimationAgent());
  registry.register(new LevelAgent());
  registry.register(new Mesh3DAgent());
  registry.register(new LightingAgent());
  registry.register(new CameraAgent());
  registry.register(new GameplayAgent());
  registry.register(new NarrativeAgent());
  registry.register(new MusicAgent());
  registry.register(new SfxAgent());
  registry.register(new UIAgent());
  registry.register(new VfxAgent());
  registry.register(new QAAgent());
  registry.register(new IntegrationAgent());
  return registry;
}

export function getAgentRegistry(): AgentRegistry {
  if (!singleton) {
    singleton = createAgentRegistry();
  }
  return singleton;
}
