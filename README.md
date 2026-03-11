# 🐳 wDocker

<p align="center">
  <strong>The Ultra-Lightweight, Modern Docker Management Studio for Web Developers</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/phanvantam/wDocker?style=for-the-badge&color=0078d4" alt="Release" />
  <img src="https://img.shields.io/github/license/phanvantam/wDocker?style=for-the-badge&color=4caf50" alt="License" />
  <img src="https://img.shields.io/github/stars/phanvantam/wDocker?style=for-the-badge&color=ffca28" alt="Stars" />
</p>

---

wDocker is a fast and elegant Docker Desktop alternative tailored specifically for web developers. Built with Tauri, Vue 3, and Rust, wDocker simplifies container management by providing built-in Nginx proxy routing, automatic `/etc/hosts` DNS resolution, and out-of-the-box project configurations for Laravel, PHP, and Node.js. It acts as a powerful, containerized alternative to tools like XAMPP or Laravel Valet.

## ✨ Highlights

- **⚡ Blazing Fast:** Boots instantly with a minimal memory footprint compared to Electron apps.
- **🌐 Built-in Nginx Proxy & DNS:** Access your local projects via custom `.test` domains without remembering ports.
- **🚀 1-Click Project Setup:** Instantly spin up Laravel, PHP, and Node environments with pre-configured Docker Compose templates.
- **🛠️ Power Tools:** Built-in interactive terminal, smart log streaming, YAML config editor, and integrated log & storage managers.
- **🛡️ Secure & Private:** Runs entirely locally via the Docker socket.

---

## 📖 Documentation

Explore more about wDocker:

- [**Product Introduction**](./docs/INTRODUCTION.md) - *Visual guide, screenshots, and feature overview.*
- [**Developer Guide**](./docs/CONTRIBUTING.md) - *Setup instructions and how to contribute.*
- [**AI Agents Guide**](./AGENTS.md) - *Context for AI assistants working on this repository.*

---

## 🚀 Quick Start

1. Ensure **Docker Desktop** (or Docker Engine) is installed and running on your machine.
2. **Download** the latest wDocker release from the [Releases Page](https://github.com/phanvantam/wDocker/releases).
3. **Install** and launch the application. wDocker will automatically connect to your local Docker socket.
4. Navigate to the **Nginx Proxy** tab to initialize the central router, then head to **Projects** to add your first web application!

## 🛠️ Built With

- [Tauri](https://tauri.app/) - Secure, native, lightweight app framework.
- [Vue 3](https://vuejs.org/) & [Tailwind CSS](https://tailwindcss.com/) - Modern reactive frontend.
- [Bollard](https://github.com/fussybeaver/bollard) - Async Docker API client for Rust.

---

## ❤️ Support & Sponsorship

wDocker is a labor of love to improve the local development experience. If you find it helpful:

- **Star the repo** to show your support!
- **Report bugs** and **request features** via GitHub Issues.

## 📄 License

wDocker is released under the **MIT License**. See [LICENSE](./LICENSE) for details.

<p align="center">
  Developed with ❤️ by <strong>Phan Van Tam</strong> and contributors.
</p>
