# WebAR PoC

Прототип для проверки стека: Vite + TypeScript + three.js + 8th Wall Engine Binary (SLAM, self-hosted).

Сценарий: «Начать» → камера и датчики → тап по поверхности ставит персонажа → джойстик, сбор 10 монет.

- `?ar=mock` — режим для ПК (OrbitControls вместо камеры).
- Слайдер «Размер» — масштаб сцены (стол / пол).

```bash
npm i
npm run dev     # для телефона нужен HTTPS: используйте туннель или GitHub Pages
npm run build
```

## Лицензии

- AR-движок: [8th Wall Engine Binary](https://github.com/8thwall/engine) © Niantic Spatial, limited-use license — см. `public/xr/LICENSE` (копируется из npm-пакета при сборке).
- Модель: RobotExpressive — Tomás Laulhé, правки Don McCurdy, CC0 1.0 (из примеров three.js).
- three.js — MIT.
