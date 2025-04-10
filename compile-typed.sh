#!/bin/bash

# Compilation avec TypeScript
echo "Compilation du code TypeScript..."
npx tsc

# Copier les fichiers HTML/CSS/JS vers le dossier dist
echo "Copie des fichiers statiques..."
cp -r public dist/

# Remplacer le point d'entrée standard par notre version typée
echo "Configuration du point d'entrée typé..."
mv dist/index-typed.js dist/index.js

echo "Compilation terminée!" 