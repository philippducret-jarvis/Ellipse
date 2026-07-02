import { ASSET_FAMILIES, type AssetFamily } from '@ellipse/shared';
import type { GameProjectAsset } from '@ellipse/shared';

interface Props {
  assets: GameProjectAsset[];
  selectedAssetId: string | null;
  onSelectFamily: (familyId: string | null) => void;
  activeFamilyId: string | null;
}

export function AssetFamilyGrid({ assets, selectedAssetId, onSelectFamily, activeFamilyId }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {ASSET_FAMILIES.map((family) => (
        <FamilyCard
          key={family.id}
          family={family}
          count={countAssetsInFamily(assets, family)}
          active={activeFamilyId === family.id}
          hasSelection={assets.some((a) => a.id === selectedAssetId && family.roles.includes(a.role))}
          onClick={() => onSelectFamily(activeFamilyId === family.id ? null : family.id)}
        />
      ))}
    </div>
  );
}

function FamilyCard({
  family,
  count,
  active,
  hasSelection,
  onClick,
}: {
  family: AssetFamily;
  count: number;
  active: boolean;
  hasSelection: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-xl border px-3 py-3 text-left transition',
        active ? 'border-[var(--color-accent)] bg-[var(--color-surface-overlay)]' : 'border-white/10 bg-[var(--color-surface-raised)] hover:border-white/20',
        hasSelection ? 'ring-1 ring-[var(--color-accent)]/40' : '',
      ].join(' ')}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">{family.group}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--color-text)]">{family.labelFr}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-[var(--color-accent)]">{count}</div>
    </button>
  );
}

function countAssetsInFamily(assets: GameProjectAsset[], family: AssetFamily): number {
  return assets.filter((a) => (family.roles as readonly string[]).includes(a.role)).length;
}

export function filterAssetsByFamily(assets: GameProjectAsset[], familyId: string | null): GameProjectAsset[] {
  if (!familyId) return assets;
  const family = ASSET_FAMILIES.find((f) => f.id === familyId);
  if (!family) return assets;
  return assets.filter((a) => (family.roles as readonly string[]).includes(a.role));
}
