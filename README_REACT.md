# Pourquoi React pour CookingLabs ?

CookingLabs est une plateforme e-learning pour apprendre à cuisiner. Elle doit afficher beaucoup de contenu interactif : cours, recettes étape par étape, vidéos, quiz et suivi de progression. Ce document explique pourquoi React a été choisi pour développer l'interface.

## 1. Une interface construite à partir de composants réutilisables

React découpe l'interface en **composants** indépendants. Une plateforme de cours de cuisine répète souvent les mêmes éléments :

- une carte de recette ou de cours (`RecipeCard`, `CourseCard`)
- une étape de recette avec image, minuteur et instructions (`RecipeStep`)
- un lecteur vidéo, un quiz, une barre de progression
- une liste d'ingrédients avec cases à cocher

Chaque élément est écrit une seule fois et réutilisé partout, ce qui donne un code plus clair, plus cohérent et plus facile à maintenir.

## 2. Une expérience utilisateur fluide et interactive

Grâce au **DOM virtuel**, React ne met à jour que les parties de la page qui changent. Pour CookingLabs, cela permet par exemple :

- de passer d'une étape de recette à la suivante sans recharger la page
- de cocher des ingrédients ou de lancer un minuteur en temps réel
- d'afficher immédiatement le résultat d'un quiz
- de mettre à jour la progression de l'apprenant pendant qu'il suit un cours

L'application peut fonctionner comme une **Single Page Application (SPA)**, ce qui rend la navigation plus rapide et agréable.

## 3. Une gestion claire de l'état de l'application

Une plateforme e-learning gère beaucoup de données qui changent : utilisateur connecté, cours suivis, progression, favoris, résultats aux quiz… Les hooks (`useState`, `useEffect`, `useContext`) et des bibliothèques comme Redux ou Zustand rendent cette gestion lisible et prévisible.

## 4. Un écosystème riche

React dispose de nombreuses bibliothèques qui répondent directement aux besoins du projet :

|·Besoin·····························|·Outil·possible··············|
|·----------------------------------·|·---------------------------·|
|·Navigation·entre·les·pages·········|·React·Router················|
|·Appels·à·l'API·/·cache·des·données·|·TanStack·Query,·Axios·······|
|·Formulaires·(inscription,·quiz)····|·React·Hook·Form·············|
|·Interface·et·design················|·Tailwind·CSS,·MUI···········|
|·Lecture·vidéo······················|·React·Player················|
|·Tests······························|·Jest,·React·Testing·Library·|


Il n'est donc pas nécessaire de tout réécrire, et le développement va plus vite.

## 5. Une grande communauté et une forte demande

React est l'une des bibliothèques front-end les plus utilisées au monde, maintenue par Meta et une large communauté open source. Cela apporte :

- une documentation complète et de nombreux tutoriels
- des réponses rapides aux problèmes courants
- une bibliothèque stable et mise à jour régulièrement
- une compétence très recherchée sur le marché du travail

## 6. Évolutivité du projet

React permet de faire grandir CookingLabs facilement :

- **Next.js** pour le rendu côté serveur et un meilleur référencement (SEO) des pages de recettes et de cours
- **React Native** pour créer plus tard une application mobile en réutilisant une partie de la logique et des connaissances, très pratique pour suivre une recette directement en cuisine depuis son téléphone

## Conclusion

React a été choisi pour CookingLabs parce qu'il permet de construire une interface **interactive, rapide et modulaire**, adaptée à une plateforme d'apprentissage riche en contenu. Son écosystème, sa communauté et ses possibilités d'évolution (web avec Next.js, mobile avec React Native) en font une base solide pour le projet aujourd'hui et pour la suite.
