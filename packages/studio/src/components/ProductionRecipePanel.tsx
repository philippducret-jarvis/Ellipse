import { useMemo } from 'react';
import { buildProductionRecipe, getGameType } from '@ellipse/shared';

/**
 * Pipeline de production par type de jeu (suivi IA & agents).
 * Affiche les étapes (agents + sorties) et les gates QA propres au genre.
 */
export function ProductionRecipePanel({ genre }: { genre?: string }) {
  const recipe = useMemo(() => {
    const id = genre && getGameType(genre) ? genre : 'platformer';
    return buildProductionRecipe(id);
  }, [genre]);

  return (
    <section className="recipe-panel">
      <header className="recipe-head">
        <h3>Pipeline de production · <span className="accent">{recipe.game_type}</span></h3>
        <span className="muted">{recipe.stages.length} étapes · IA maîtresse + agents</span>
      </header>

      <ol className="recipe-stages">
        {recipe.stages.map((stage, i) => (
          <li key={stage.id} className="recipe-stage">
            <div className="recipe-stage-index">{String(i + 1).padStart(2, '0')}</div>
            <div className="recipe-stage-body">
              <div className="recipe-stage-label">{stage.label}</div>
              <div className="recipe-stage-agents">
                {stage.agents.map((a) => (
                  <span key={a} className="chip chip-sm">{a}</span>
                ))}
              </div>
              {stage.outputs.length > 0 && (
                <div className="recipe-stage-outputs">→ {stage.outputs.slice(0, 6).join(', ')}{stage.outputs.length > 6 ? '…' : ''}</div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="recipe-gates">
        <span className="recipe-gates-label">Gates QA</span>
        {recipe.qa_gates.map((g) => (
          <span key={g} className="chip chip-sm chip-success">{g}</span>
        ))}
      </div>
    </section>
  );
}
