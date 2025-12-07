// Script de migration : localStorage vers base de données
// Ce script s'exécute dans le navigateur (console DevTools)

async function migrateLocalStorageToDB() {
  console.log('🔄 Début de la migration des parcours...');
  
  const courses = [];
  
  // Récupérer tous les parcours du localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('dgmap_course_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        courses.push({
          id: key,
          ...data
        });
      } catch(e) {
        console.warn(`⚠️ Impossible de parser le parcours ${key}:`, e);
      }
    }
  }
  
  console.log(`📦 ${courses.length} parcours trouvés dans le localStorage`);
  
  // Envoyer chaque parcours à l'API
  let successCount = 0;
  let errorCount = 0;
  
  for (const course of courses) {
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(course),
      });
      
      if (response.ok) {
        successCount++;
        console.log(`✅ Parcours "${course.name}" migré avec succès`);
      } else {
        const error = await response.json();
        errorCount++;
        console.error(`❌ Erreur pour "${course.name}":`, error);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Erreur réseau pour "${course.name}":`, error);
    }
  }
  
  console.log('\n📊 Résultats de la migration:');
  console.log(`   ✅ Réussis: ${successCount}`);
  console.log(`   ❌ Échecs: ${errorCount}`);
  
  if (successCount > 0) {
    console.log('\n⚠️ IMPORTANT: Les parcours ont été migrés vers la base de données.');
    console.log('Vous pouvez maintenant supprimer les anciennes données du localStorage si vous le souhaitez.');
    console.log('Pour cela, exécutez: clearLocalStorageCourses()');
  }
  
  return { successCount, errorCount, total: courses.length };
}

function clearLocalStorageCourses() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('dgmap_course_')) {
      keys.push(key);
    }
  }
  
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`🗑️ ${keys.length} parcours supprimés du localStorage`);
}

// Exécuter la migration
console.log('📝 Script de migration chargé!');
console.log('Pour migrer vos parcours, exécutez: migrateLocalStorageToDB()');
console.log('Pour nettoyer le localStorage après, exécutez: clearLocalStorageCourses()');
