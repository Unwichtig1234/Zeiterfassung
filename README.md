# Zeiterfassung Pro Desktop

Desktop-Anwendung auf Basis von Electron + React + Vite.

## Enthalten
- Zeiterfassung
- Projekte und Budgets
- Gantt-Grundansicht
- Ressourcenboard mit Zukunftsprognose
- PDF-Report (Management / Technik)
- Lokale Datenspeicherung via `localStorage`

## Entwicklung starten
```bash
npm install
npm run dev
```

In einem zweiten Terminal:
```bash
npm run electron:dev
```

## Installationsdatei bauen
```bash
npm install
npm run dist
```

Electron Builder erzeugt je nach Plattform:
- Windows: NSIS-Installer
- Linux: AppImage
- macOS: DMG

## Hinweis
Der Build ist konfiguriert. In dieser Umgebung konnte ich die npm-Abhängigkeiten nicht installieren und deshalb keinen fertigen Installer ausführen. Das Projekt ist aber so vorbereitet, dass du oder ein Entwickler es direkt lokal bauen könnt.
