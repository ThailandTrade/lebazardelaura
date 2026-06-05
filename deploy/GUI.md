# Bureau graphique sur le VPS (optionnel) — XFCE + xRDP

> ⚠️ **L'app n'a PAS besoin de GUI** : elle tourne en headless (systemd + Caddy).
> Ce bureau distant sert seulement au confort (éditer, tester dans un navigateur).
> Le plus simple depuis Windows : **XFCE + xRDP** → on s'y connecte avec
> « Connexion Bureau à distance » (`mstsc`).

VPS Contabo type : **Ubuntu 24.04 / 22.04 LTS** (Debian quasi identique).

## 1. Connexion + MAJ
```bash
ssh root@TON_IP
apt update && apt -y upgrade
```

## 2. Utilisateur dédié (éviter de tout faire en root)
```bash
adduser laura            # mot de passe = aussi celui du RDP
usermod -aG sudo laura
```

## 3. Bureau XFCE (léger — éviter GNOME/KDE sur un VPS)
```bash
apt -y install xfce4 xfce4-goodies
```

## 4. xRDP
```bash
apt -y install xrdp
adduser xrdp ssl-cert
echo "startxfce4" > /home/laura/.xsession
chown laura:laura /home/laura/.xsession
systemctl enable --now xrdp
systemctl restart xrdp
```

## 5. Pare-feu (RDP est une cible — restreindre !)
```bash
apt -y install ufw
ufw allow OpenSSH
# Idéalement, RDP réservé à TON IP perso :
ufw allow from TON_IP_PERSO to any port 3389 proto tcp
# (sinon, ouvert à tous : ufw allow 3389/tcp  ← moins sûr)
ufw enable
```
> Si Contabo a un pare-feu dans son panel, autorise-y 22, 3389, 80, 443.

## 6. Connexion depuis Windows
- `mstsc` → Ordinateur : `TON_IP` → utilisateur `laura` + mot de passe (session **Xorg**).
- Navigateur : `sudo apt -y install firefox-esr` (ou `chromium-browser`).

## Notes
- **RAM** : XFCE+xRDP ≈ 300–600 Mo, Firefox 300–800 Mo. Sur 12 Go, négligeable
  (voir DEPLOYMENT « Travailler sur le VPS »).
- **Sécurité** : restreins le RDP à ton IP, mot de passe fort ; idéalement tunnelise-le
  via SSH plus tard plutôt que de l'exposer.
- Ports : 22/3389 = admin serveur ; 80/443 = Caddy ; 3000 = Next (interne) ; 5432 = Postgres.
