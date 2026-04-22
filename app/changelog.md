# Changelog

## v1.2
- TypeScript-fouten rond gekoppelde zijdes opgelost
- Automatisch koppelen van Voorzijde/Achterzijde en Linkerzijde/Rechterzijde werkt nu echt
- Handmatig afmetingen overnemen van een andere zijde vult velden direct in
- Autosave toegevoegd via localStorage
- Ingevulde gegevens worden automatisch teruggeladen bij heropenen
- Reset-knop toegevoegd voor opgeslagen gegevens
- Opgeslagen foto’s worden niet bewaard; gebruiker krijgt hiervan melding

## v1.1
- Nieuwe optie toegevoegd om afmetingen over te nemen van een andere zijde
- Ondersteuning toegevoegd voor gelijke zijdes, zoals voor/achter en links/rechts
- Nieuwe gemiddelde inschatting toegevoegd op basis van aantal kozijnen
- Gemiddelde grootte kozijnen toegevoegd met vaste waarden:
  - Klein – gemiddeld 1,0 m² per kozijn
  - Gemiddeld – gemiddeld 1,6 m² per kozijn
  - Groot – gemiddeld 2,5 m² per kozijn
- Automatische aftrek per zijde toegevoegd op basis van aantal kozijnen en gekozen gemiddelde grootte
- Totaaloverzicht toegevoegd met bruto oppervlak, aftrek en netto oppervlak

## v1.0
- GevelPlanner branding toegevoegd (titel + tagline: "Bereken je gevel in 2 minuten")
- Visualisatie per zijde toegevoegd
- Per zijde keuze toegevoegd: geen ramen/deuren, AI laten inschatten, handmatig invullen of overslaan
- Preview per zijde toegevoegd voor foto of gekozen bestand
- AI-inschatting van ramen en deuren toegevoegd op basis van foto en opgegeven breedte en hoogte van de zijde
- Handmatige correctie van AI-resultaten toegevoegd
- Ondersteuning toegevoegd voor meerdere zijdes met afzonderlijke foto’s en instellingen
- Backend API-routes toegevoegd voor AI-analyse en visualisatieverwerking
- Netto geveloppervlak per zijde en totaalberekening op basis van ramen en deuren
- UX verbeterd: duidelijkere terminologie ("ramen/deuren" in plaats van "openingen") en gebruiksvriendelijkere instructies
## v0.9
- Visualisatie per zijde toegevoegd
- Per zijde keuze toegevoegd: geen openingen, AI laten inschatten, handmatig invullen of overslaan
- Preview per zijde toegevoegd voor foto of gekozen bestand
- AI-inschatting van kozijnen en openingen toegevoegd op basis van foto plus ingevulde breedte en hoogte van de zijde
- Handmatige correctie van AI-resultaten toegevoegd
- Ondersteuning toegevoegd voor meerdere zijdes met afzonderlijke foto’s en instellingen
- Backend API-routes toegevoegd voor openingenanalyse en visualisatieverwerking
- Netto geveloppervlak per zijde en totaalberekening voorbereid op basis van openingen

## v0.8
- Uploadknop opgesplitst in Maak foto en Kies bestand
- Camera opent niet meer standaard bij alle uploads
- Instructietekst toegevoegd voor camera- en fototoegang op iPhone en Android
- Upload UX gebruiksvriendelijker gemaakt op mobiel

## v0.7
- Mobiele flow verder vereenvoudigd
- Foto staat nu bovenaan in stap 1
- Dupliceerfunctie verwijderd
- Aftrek standaard op gemiddelde 18% gezet
- Handmatige aftrek blijft mogelijk
- Gebruik afmeting van andere zijde behouden
- Maximaal 10 zijdes ingesteld

## v0.6
- Mobiele layout aangepast: alles staat nu onder elkaar
- Stap 1, stap 2 en visualisatie verticaal geplaatst voor beter gebruik op telefoon
- Knoppen groter gemaakt voor duimvriendelijk gebruik
- Uploadflow op mobiel verbeterd
- Materiaal- en navigatieflow duidelijker gemaakt op kleine schermen

## v0.5
- Tweestaps flow toegevoegd: eerst oppervlakteberekening, daarna materiaalberekening
- Knop toegevoegd om direct naar materiaalberekening te gaan
- Knop toegevoegd om terug te gaan naar oppervlakteberekening
- Dupliceer zijde toegevoegd
- Optie toegevoegd: gebruik maat van andere zijde
- Mobiele workflow verbeterd voor sneller gebruik op locatie

## v0.4
- Oppervlakte en materiaalberekening logisch van elkaar gescheiden
- Netto oppervlak eerst berekenen, daarna pas materiaalresultaat en kosten
- Flow logischer gemaakt voor gebruik op telefoon

## v0.3
- Mobiele camera-upload toegevoegd
- Upload UX verbeterd
- Duidelijkere uploadknoppen en bestandsvalidatie toegevoegd

## v0.2
- Meertaligheid toegevoegd (Nederlands / Engels)
- Teksten duidelijker gemaakt
- Upload labels verbeterd

## v0.1
- Eerste werkende MVP
- Gevelzijdes invoeren
- Oppervlakte berekenen
- Planken / verf berekening
- Basis visualisatie toegevoegd