# モバイルの接続設定

> **最終更新日**: 2026-10-24
> **更新者**: AI (Codex)

## 概要

`.env.local`はGit対象外の端末設定。既存のSupabase URL・publishable key・組織名と、Alanが案内したGoogle Web／iOSの公開クライアントIDを保持する。OAuthクライアントsecretや署名秘密鍵を入れない。設定値はコミットしない。

## フォルダ構成

- `.env.local` — 端末設定（Git対象外、ビルド時にアセットとして読み込む）
- `README.md` — この案内

リリースは`lib/main.dart`を使用し、Googleの設定を引き継ぐ。詳細は../../README.mdを参照。
