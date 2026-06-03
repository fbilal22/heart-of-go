import { useEffect, useRef, memo } from "react";

type WidgetProps = {
  scriptSrc: string;
  config: Record<string, unknown>;
  height?: number | string;
  className?: string;
};

function TradingViewWidget({ scriptSrc, config, height = 500, className }: WidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>';
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify(config);
    containerRef.current.appendChild(script);
  }, [scriptSrc, config]);

  return (
    <div
      className={`tradingview-widget-container w-full ${className ?? ""}`}
      ref={containerRef}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <div className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

export const TickerTape = memo(() => (
  <TradingViewWidget
    height={46}
    scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
    config={{
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
        { description: "CAC 40", proName: "INDEX:CAC40" },
        { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "compact",
      colorTheme: "light",
      locale: "fr",
    }}
  />
));

export const MarketOverview = memo(() => (
  <TradingViewWidget
    height={460}
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

export const StockHeatmap = memo(() => (
  <TradingViewWidget
    height={460}
    scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js"
    config={{
      exchanges: [],
      dataSource: "SPX500",
      grouping: "sector",
      blockSize: "market_cap_basic",
      blockColor: "change",
      locale: "fr",
      symbolUrl: "",
      colorTheme: "light",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "100%",
    }}
  />
));

export const CryptoHeatmap = memo(() => (
  <TradingViewWidget
    height={460}
    scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js"
    config={{
      dataSource: "Crypto",
      blockSize: "market_cap_calc",
      blockColor: "24h_close_change|5",
      locale: "fr",
      symbolUrl: "",
      colorTheme: "light",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "100%",
    }}
  />
));
