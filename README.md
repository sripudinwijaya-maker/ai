# DhenLee AI Multi Runner — Real Hyperbrowser API

Aplikasi Vercel untuk menjalankan satu prompt yang sama pada beberapa Hyperbrowser API keys secara independen, memantau status job Hyperbrowser, dan mengumpulkan hasil.

## Implementasi
- Backend menggunakan SDK resmi `@hyperbrowser/sdk` versi `1.5.7`.
- Endpoint `POST /api/start`: memanggil `client.agents[agent].start(...)` dan mengambil `jobId`.
- Endpoint `POST /api/status`: memanggil `getStatus(jobId)` dan mengambil hasil akhir dengan `get(jobId)`.
- Frontend melakukan polling setiap 3.5 detik. Maksimal empat job dimulai/di-poll bersamaan dari tab ini.
- Monitor count membagi kartu laporan menjadi kelompok; tidak menambah sesi browser.
- API keys hanya disimpan dalam memori browser selama tab aktif; tidak disimpan ke localStorage atau database.

## Deploy ke Vercel
1. Ekstrak ZIP.
2. Upload isi folder ke repository GitHub (file `package.json` harus di root repository).
3. Import repository ke Vercel dan deploy.
4. Buka deployment. Tambahkan Hyperbrowser API key melalui API Manager.
5. Pilih Agent/model, isi prompt, lalu jalankan.

## Catatan konfigurasi
- OpenAI CUA default `gpt-6-astra`, `useComputerAction: true`, dan reasoning effort. Pilihan model/effort mengikuti dokumentasi OpenAI CUA Hyperbrowser.
- Browser Use default UI `gemini-2.0-flash`; Hyperbrowser dapat memetakan alias model sesuai endpoint.
- Untuk agent lain, isi model ID yang memang didukung agent tersebut. Tidak semua model dapat dipakai pada semua agent.
- Agent list dan parameter berdasarkan dokumentasi Hyperbrowser; beberapa provider/agent mungkin tidak tersedia pada semua akun/plan.
- 50 API key adalah batas UI, bukan jaminan 50 concurrency. Credits, concurrency, rate limits, dan model charges tetap mengikuti plan/provider.
- Vercel serverless duration/usage limits juga berlaku. Long-running jobs are polled client-side; no single HTTP request waits for the entire task.

## Security
- API keys are sent from the browser to your Vercel backend over HTTPS for each start/status request.
- Do not commit keys into GitHub, source files, or screenshots.
- Do not enter website passwords, OTPs, cookies, or session tokens in this app. Use only accounts and websites you are authorized to access.


## Generate Key shortcut
The **Generate Key** button fills the prompt with a safe default task for opening the official Hyperbrowser API-key settings page, then immediately submits it through the configured runner. Job status and returned output are rendered in the monitor as polling progresses. Because the runner itself is authenticated with a Hyperbrowser API key, at least one valid key must already be added in API Manager. Actual key creation, login, and handling of secret values remain manual actions by the account owner; the default task explicitly tells the agent not to create, copy, or reveal a secret. This shortcut does not itself mint an API key.


## Interface
The compact WEB TOOLS page shows Agent and Model selectors, then the monitor, prompt actions, and API menu. Reasoning effort defaults to `medium` and max steps defaults to `50`; both are hidden from the interface. API keys can be added individually or imported from a TXT file, and the list shows names with masked values. Keys are automatically restored from and saved to browser `localStorage` on add, import, individual delete, and clear-all actions. Browser local storage is not encrypted; avoid shared devices.
