#!/bin/bash

# Créer le répertoire de sortie s'il n'existe pas
mkdir -p dist

# Supprimer les anciens fichiers JavaScript du répertoire dist
rm -rf dist/*.js

# Compiler tous les fichiers TypeScript
echo "Compilation des fichiers TypeScript..."
for ts_file in $(find src -name "*.ts"); do
  # Obtenir le chemin du fichier de sortie
  relative_path=${ts_file#src/}
  output_file="dist/${relative_path%.ts}.js"
  
  # Créer le répertoire parent si nécessaire
  mkdir -p $(dirname "$output_file")
  
  # Compiler le fichier
  echo "Compilation de $ts_file vers $output_file"
  npx tsc --skipLibCheck --allowSyntheticDefaultImports --esModuleInterop --target es2016 --module commonjs --sourceMap --outDir dist "$ts_file"
done

echo "Compilation terminée." 