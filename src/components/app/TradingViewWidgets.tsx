import { useEffect, useRef, memo } from "react";

type WidgetProps = {
  scriptSrc: string;
  config: Record<string, unknown>;
  height?: number | string;
};

function TradingViewWidget({ scriptSrc, config, height = 500 }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Clean any previous script (e.g. on hot reload / tab switch)
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [scriptSrc, config]);

  return (
    <div
      className="tradingview-widget-container w-full"
      ref={containerRef}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}

export const TickerTape = memo(() => (
  <TradingViewWidget
    height={82}
    scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
    config={{
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
        { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
        { description: "CAC 40", proName: "INDEX:CAC40" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "light",
      locale: "fr",
    }}
  />
));

export const MarketOverview = memo(() => (
  <TradingViewWidget
    height={520}
    scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js"
    config={{
      colorTheme: "light",
      dateRange: "12M",
      showChart: true,
      locale: "fr",
      isTransparent: true,
      showSymbolLogo: true,
      width: "100%",
      height: "100%",
      tabs: [
        {
          title: "Indices",
          symbols: [
            { s: "FOREXCOM:SPXUSD", d: "S&P 500" },
            { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" },
            { s: "INDEX:CAC40", d: "CAC 40" },
            { s: "INDEX:DEU40", d: "DAX" },
          ],
        },
        {
          title: "Crypto",
          symbols: [
            { s: "BITSTAMP:BTCUSD", d: "Bitcoin" },
            { s: "BITSTAMP:ETHUSD", d: "Ethereum" },
            { s: "BINANCE:SOLUSDT", d: "Solana" },
          ],
        },
        {
          title: "Forex",
          symbols: [
            { s: "FX_IDC:EURUSD", d: "EUR/USD" },
            { s: "FX_IDC:GBPUSD", d: "GBP/USD" },
            { s: "FX_IDC:EURGBP", d: "EUR/GBP" },
          ],
        },
      ],
    }}
  />
));

export const Screener = memo(() => (
  <div className="w-full overflow-x-auto -mx-1">
    <div
      style={{
        minWidth: 1100,
        transform: "scale(1.05)",
        transformOrigin: "top left",
        width: "95.24%",
      }}
    >
        <TradingViewWidget
        height={2400}
        scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-screener.js"
        config={{
          width: "100%",
          height: "100%",
          defaultColumn: "overview",
          defaultScreen: "most_capitalized",
          showToolbar: true,
          locale: "fr",
          market: "us",
          colorTheme: "light",
          isTransparent: true,
        }}
      />
    </div>
  </div>
));
