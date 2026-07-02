<script lang="ts">
  // Renders a glyph from the custom set (spec ui-standards/icons.md). Icons use
  // currentColor so they inherit the surrounding text colour. Directional icons
  // flip under RTL.
  import { ICONS, type IconName } from '../icons/icons';

  type Props = {
    name: IconName;
    size?: number;
    label?: string; // sets role=img + aria-label; otherwise decorative (aria-hidden)
    class?: string;
  };
  let { name, size = 20, label, class: cls = '' }: Props = $props();

  const DIRECTIONAL = new Set(['arrow-left', 'arrow-right', 'chevron-down', 'chevrons-down']);

  let def = $derived(ICONS[name]);
  let directional = $derived(DIRECTIONAL.has(name));

  // Outline icons need round caps/joins (spec icons.md); the type is a fixed union so
  // narrow the generated string values.
  type Cap = 'round' | 'butt' | 'square' | undefined;
  type Join = 'round' | 'miter' | 'bevel' | undefined;
  let linecap = $derived(
    (def?.attrs['stroke-linecap'] ?? (def?.attrs.stroke ? 'round' : undefined)) as Cap,
  );
  let linejoin = $derived(
    (def?.attrs['stroke-linejoin'] ?? (def?.attrs.stroke ? 'round' : undefined)) as Join,
  );
</script>

{#if def}
  <svg
    class="icon {cls}"
    class:directional
    width={size}
    height={size}
    viewBox={def.viewBox}
    fill={def.attrs.fill ?? 'currentColor'}
    stroke={def.attrs.stroke}
    stroke-width={def.attrs['stroke-width']}
    stroke-linecap={linecap}
    stroke-linejoin={linejoin}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : 'true'}
    focusable="false"
  >
    {@html def.body}
  </svg>
{/if}

<style>
  .icon {
    display: inline-block;
    flex: none;
    vertical-align: middle;
  }
  /* Directional icons flip horizontally under RTL */
  :global([dir='rtl']) .icon.directional {
    transform: scaleX(-1);
  }
</style>
