# IFarma Connect Demo

Mobile-first React + Vite hackathon demo for produce aggregation in Eastern Cape.

## Run

```bash
npm install
npm run dev
```

## Build + lint

```bash
npm run lint
npm run build
```

## Demo credentials

- Farmer: `071 000 0101` / `1234`
- Buyer: `072 000 0201` / `1234`
- Coordinator: `071 000 0001` / `1111`

## Demo flow

1. Register farmer and complete 4-step verification.
2. Coordinator approves in **Verification Queue**.
3. Register buyer and post **100 kg cabbage** order.
4. Run **Match order** and confirm collection plan.
5. Coordinator advances connections to **Collected** and **Sale Completed**.
6. Dashboard updates KPIs/funnel/real sales from connection records.
