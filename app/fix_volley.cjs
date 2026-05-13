const fs = require('fs');

const path = 'c:\\\\Users\\\\Adam\\\\Dropbox\\\\Documents\\\\homework\\\\Personal Projects\\\\Chain of Command Game\\\\app\\\\src\\\\components\\\\combat\\\\VolleyBreakdown.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('TouchTooltipPortal')) {
  content = content.replace(
    "import { useViewport } from '../../utils/useViewport';",
    "import { useViewport } from '../../utils/useViewport';\nimport TouchTooltipPortal from '../TouchTooltipPortal';"
  );
}

if (!content.includes('function BreakdownRow')) {
  const breakdownRowCode = `
function BreakdownRow({
  id,
  activeTooltip,
  setActiveTooltip,
  isCoarsePointer,
  tooltipText,
  label,
  valueNode,
  containerStyle
}: {
  id: string;
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
  isCoarsePointer: boolean;
  tooltipText: string;
  label: React.ReactNode;
  valueNode: React.ReactNode;
  containerStyle?: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isSelected = activeTooltip === id;

  return (
    <div
      ref={ref}
      className="flex-between"
      style={{ fontSize: '0.75rem', position: 'relative', ...containerStyle }}
      title={isCoarsePointer ? undefined : tooltipText}
      onClick={(e) => {
        if (isCoarsePointer) {
          e.stopPropagation();
          setActiveTooltip(isSelected ? null : id);
        }
      }}
    >
      {label}
      {valueNode}
      {isCoarsePointer && (
        <TouchTooltipPortal show={isSelected} anchorRef={ref}>
          {tooltipText}
        </TouchTooltipPortal>
      )}
    </div>
  );
}
`;
  content = content.replace('export default function VolleyBreakdown', breakdownRowCode + '\nexport default function VolleyBreakdown');
}

content = content.replace(
  /<div\s+className="flex-between"\s+style=\{\{\s*(.*?)\s*\}\}\s+title=\{isCoarsePointer \? undefined : "(.*?)"\}\s+onClick=\{\(e\) => \{\s+if \(isCoarsePointer\) \{\s+e\.stopPropagation\(\);\s+setActiveTooltip\(activeTooltip === '(.*?)' \? null : '(.*?)'\);\s+\}\s+\}\}\s*>\s+([\s\S]*?)\s+\{isCoarsePointer && activeTooltip === '(.*?)' && \(\s+<div className="touch-tooltip".*?>.*?<\/div>\s+\)\}\s+<\/div>/g,
  (match, style, tooltipText, id1, id2, innerContent, id3) => {
    const lines = innerContent.split('\n').filter((l) => l.trim().length > 0);
    const inner = lines.join(' ');
    let splitIndex = inner.indexOf('</span>');
    if (splitIndex === -1) return match; 
    
    const label = inner.substring(0, splitIndex + 7);
    const valueNode = inner.substring(splitIndex + 7).trim();

    return `<BreakdownRow
                                    id="${id1}"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="${tooltipText}"
                                    containerStyle={{${style}}}
                                    label={${label}}
                                    valueNode={${valueNode}}
                                  />`;
  }
);

content = content.replace(
  /<div\s+className="flex-between"\s+style=\{\{ fontSize: '0\.9rem', borderTop: '1px solid rgba\(255,255,255,0\.2\)', paddingTop: '6px', marginTop: '2px', position: 'relative' \}\}\s+title=\{isCoarsePointer \? undefined : "The remaining shield energy in this arc\."\}\s+onClick=\{\(e\) => \{\s+if \(isCoarsePointer\) \{\s+e\.stopPropagation\(\);\s+setActiveTooltip\(activeTooltip === 'rem-shields' \? null : 'rem-shields'\);\s+\}\s+\}\}\s*>\s+([\s\S]*?)\s+\{isCoarsePointer && activeTooltip === 'rem-shields' && \(\s+<div className="touch-tooltip" style=\{\{ bottom: 'calc\(100% \+ 8px\)' \}\}>The remaining shield energy in this arc\.<\/div>\s+\)\}\s+<\/div>/g,
  (match, innerContent) => {
    const lines = innerContent.split('\n').filter((l) => l.trim().length > 0);
    const inner = lines.join(' ');
    let splitIndex = inner.indexOf('</span>');
    if (splitIndex === -1) return match; 
    
    const label = inner.substring(0, splitIndex + 7);
    const valueNode = inner.substring(splitIndex + 7).trim();

    return `<BreakdownRow
                                    id="rem-shields"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The remaining shield energy in this arc."
                                    containerStyle={{ fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '6px', marginTop: '2px', position: 'relative' }}
                                    label={${label}}
                                    valueNode={${valueNode}}
                                  />`;
  }
);

content = content.replace(
  /<div\s+className="flex-between"\s+style=\{\{ fontSize: '0\.9rem', borderTop: '1px solid rgba\(255,255,255,0\.2\)', paddingTop: '6px', marginTop: '2px', position: 'relative' \}\}\s+title=\{isCoarsePointer \? undefined : "The final amount of Hull Damage dealt to the defender\."\}\s+onClick=\{\(e\) => \{\s+if \(isCoarsePointer\) \{\s+e\.stopPropagation\(\);\s+setActiveTooltip\(activeTooltip === 'final-hull' \? null : 'final-hull'\);\s+\}\s+\}\}\s*>\s+([\s\S]*?)\s+\{isCoarsePointer && activeTooltip === 'final-hull' && \(\s+<div className="touch-tooltip" style=\{\{ bottom: 'calc\(100% \+ 8px\)' \}\}>The final amount of Hull Damage dealt to the defender\.<\/div>\s+\)\}\s+<\/div>/g,
  (match, innerContent) => {
    const lines = innerContent.split('\n').filter((l) => l.trim().length > 0);
    const inner = lines.join(' ');
    let splitIndex = inner.indexOf('</span>');
    if (splitIndex === -1) return match; 
    
    const label = inner.substring(0, splitIndex + 7);
    const valueNode = inner.substring(splitIndex + 7).trim();

    return `<BreakdownRow
                                    id="final-hull"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The final amount of Hull Damage dealt to the defender."
                                    containerStyle={{ fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '6px', marginTop: '2px', position: 'relative' }}
                                    label={${label}}
                                    valueNode={${valueNode}}
                                  />`;
  }
);


fs.writeFileSync(path, content, 'utf8');
console.log('done');
