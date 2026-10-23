# Sauvegardes de la base Lumio

La base PostgreSQL de production est exportée automatiquement chaque jour à 03 h 17 UTC par GitHub Actions. Chaque export est validé avec `pg_restore`, chiffré en AES-256 avant son envoi, puis conservé pendant 14 jours.

Le workflow peut aussi être lancé manuellement depuis **GitHub > Actions > Sauvegarde quotidienne de la base Lumio > Run workflow**.

## Télécharger et vérifier une sauvegarde

1. Ouvrir l'exécution GitHub Actions souhaitée et télécharger son artefact `lumio-database-backup-*`.
2. Décompresser l'artefact dans un dossier vide.
3. Vérifier son intégrité avec `sha256sum -c lumio-*.enc.sha256`.
4. Récupérer `BACKUP_ENCRYPTION_KEY` dans les variables privées Railway. Ne jamais publier cette clé.
5. Déchiffrer l'export :

   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
     -pass env:BACKUP_ENCRYPTION_KEY \
     -in lumio-AAAA-MM-JJTHH-MM-SSZ-ID.dump.enc \
     -out lumio.dump
   ```

6. Vérifier le fichier déchiffré :

   ```bash
   docker run --rm -v "$PWD:/restore:ro" postgres:18-alpine \
     pg_restore --list /restore/lumio.dump
   ```

Avant toute restauration, utiliser une base vide de test. Une restauration directement sur la production peut remplacer des données et doit être préparée séparément.
