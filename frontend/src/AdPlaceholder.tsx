// Ad container - clean, minimal styling for ad networks
// Ads display as styled boxes with optional close buttons
export const AdPlaceholder = ({
  width,
  height,
  type = 'banner'
}: {
  width: number;
  height: number;
  type?: string;
}) => {
  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        minHeight: `${height}px`,
        minWidth: `${width}px`,
        background: 'linear-gradient(135deg, #1a3a52 0%, #0f2a40 100%)',
        border: '1px solid rgba(100, 150, 200, 0.3)',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        margin: '0 auto',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
      title="Advertisement"
    >
      {/* Ad space - real ads can load here */}
      <span style={{
        fontSize: '10px',
        color: 'rgba(100, 150, 200, 0.4)',
        fontWeight: '500',
        pointerEvents: 'none',
      }}>
        —
      </span>
    </div>
  );
};
