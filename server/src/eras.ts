/**
 * Eras. Each pins the tale to one year and briefs the Keeper on the real
 * people, places and events of that moment, so the story is researched,
 * not generic. Keep this file identical in spirit to artifact/old-tavern.html.
 */
export interface Era {
  id: string;
  name: string;
  when: string;
  currency: string;
  historical: boolean;
  blurb: string;
  briefing: string;
  people: string[];
  places?: string[];
  examples: string[];
}

/** What a game stores about its era (custom eras carry the player's words). */
export interface EraRef {
  id: string;
  name: string;
  when: string;
  currency: string;
  historical: boolean;
  custom: string;
}

export const ERAS: Era[] = [
  {
    id: "classic-fantasy", name: "Classic Fantasy", when: "An age of kingdoms and magic", currency: "gold", historical: false,
    blurb: "Kingdoms, dungeons, dragons and spells. The tavern's home turf.",
    briefing: "A high-fantasy world of your own invention: feudal kingdoms, guilds, wizards' towers, ancient ruins, orcs, elves and dragons. Magic is common and reliable. Invent people, places and history freely; keep them consistent once introduced.",
    people: [],
    examples: ["A dwarven blacksmith who lost his forge to a dragon and swore never to make another weapon. He carries a hammer anyway.", "A street magician who can do one real spell and pretends the rest are also real. Charming, broke, owes money to a tiefling loan shark."],
  },
  {
    id: "egypt", name: "Ancient Egypt", when: "1275 BC, reign of Ramesses II", currency: "deben of copper", historical: true,
    blurb: "The Nile in flood, Pharaoh's new capital rising, and the gods very close.",
    briefing: "New Kingdom Egypt, 19th Dynasty, the year 1275 BC: the fifth year of Pharaoh Ramesses II, one year after his chariot battle against the Hittites at Kadesh, which he is having carved on every temple wall as a victory it barely was. Bronze tools and weapons, chariots, papyrus, linen, beer and emmer bread; no coinage (trade is by barter weighed in deben of copper or silver); scribes and priests hold the real power under Pharaoh. Amun's temple at Karnak in Thebes is the richest institution on earth. The tomb-builders of Deir el-Medina keep records of everything, including the first recorded labour strike a generation later. Beliefs are real in this tale: heka (magic), amulets, oaths sworn before the gods, the weighing of the heart. Keep magic mythic and priestly, never a fantasy fireball.",
    people: [
      "Ramesses II, Pharaoh, 28 years old, vain, vigorous, obsessed with monuments and his Kadesh 'victory'",
      "Nefertari, Great Royal Wife, cultured and politically sharp, for whom Abu Simbel's smaller temple is being planned",
      "Paser, Vizier of Upper Egypt, the most powerful administrator in the kingdom",
      "Khaemwaset, the Pharaoh's young son, later High Priest of Ptah at Memphis and the first restorer of ancient monuments",
      "Muwatalli II, Great King of the Hittites, Egypt's rival, whose spies watch the Delta",
      "The tomb-workers of Deir el-Medina, foremen and scribes who know every secret of the Valley of the Kings",
    ],
    places: ["Pi-Ramesses, the new capital in the Delta, still being built", "Thebes (Waset) and the temple of Amun at Karnak", "Memphis and the temple of Ptah", "The Valley of the Kings and the workers' village of Deir el-Medina", "The Nile ferries, the Fayum, the Sinai turquoise mines"],
    examples: ["A tomb-builder's daughter from Deir el-Medina who can read the sacred writing she is not supposed to know, and has seen what the foremen steal.", "A Nubian archer discharged from Pharaoh's army after Kadesh, carrying a Hittite dagger he should not have."],
  },
  {
    id: "greece", name: "Classical Greece", when: "431 BC, the eve of the Peloponnesian War", currency: "drachmae", historical: true,
    blurb: "Athens at its height, Sparta sharpening its spears, oracles that never lie plainly.",
    briefing: "Greece in the spring of 431 BC. Athens under Pericles is the richest city in the Greek world, its Acropolis crowned by the new Parthenon, its empire held by triremes based at Piraeus. Sparta and its allies are about to invade Attica, opening the Peloponnesian War; next summer a plague will strike crowded Athens. Hoplites fight in bronze and linen, ships are triremes, money is silver drachmae stamped with Athena's owl. Citizens argue in the Agora and the Assembly; women, slaves and foreigners (metics) have no vote. The gods are real in this tale: Delphi's oracle speaks truly but slantwise, heroes' bones are relics, and creatures of myth linger at the edges of the map. Keep the supernatural at the level of myth and omen.",
    people: [
      "Pericles, first citizen of Athens, orator and strategos, about 64, building the empire's glory and leading it into war",
      "Aspasia of Miletus, Pericles' partner, brilliant, mocked by comedians, host to philosophers",
      "Socrates, about 38, stonemason's son, hoplite veteran, asking dangerous questions in the Agora",
      "Sophocles and Euripides, rival tragedians staging plays at the Dionysia",
      "Herodotus, the travelling historian, reading his Histories aloud in Athens",
      "Phidias, sculptor of the Parthenon, lately accused by Pericles' enemies of embezzling gold",
      "Alcibiades, about 19, Pericles' ward, beautiful, reckless, already talked about",
      "King Archidamus II of Sparta, cautious, about to lead the invasion he argued against",
    ],
    places: ["The Acropolis and the Agora of Athens", "Piraeus and the Long Walls", "Delphi and its oracle", "Sparta, Corinth, Thebes, Olympia", "The islands of the Athenian empire"],
    examples: ["A Spartan helot who fled to Athens and now rows a trireme for wages, hiding an accent that could get him killed by either side.", "A Delphic temple attendant who has heard an oracle meant for Pericles and cannot un-hear it."],
  },
  {
    id: "rome", name: "Imperial Rome", when: "63 BC, the year of the Catiline conspiracy", currency: "denarii", historical: true,
    blurb: "The Republic is rotting, the Forum seethes, and someone is planning to burn it all.",
    briefing: "Rome in 63 BC, the late Republic. Cicero is consul; the bankrupt aristocrat Catiline, having lost the election, is gathering debtors, veterans and cut-throats to seize the city by fire and murder. Pompey is away conquering the East; Crassus is the richest man in Rome and funds everyone; Julius Caesar has just been elected Pontifex Maximus on borrowed money. The city is a million people of brick and timber tenements (the Subura), aqueducts, temples, gangs, moneylenders and slaves. Legions are iron and discipline; gladiators train at Capua; the Tullianum prison waits below the Capitol. Money is silver denarii, sestertii, bronze asses. Religion is omens, augurs, household gods and sworn oaths; keep the supernatural ambiguous and grounded unless the tone demands otherwise. In November Cicero will expose the plot in the Senate; on 5 December the conspirators will be strangled in the Tullianum.",
    people: [
      "Marcus Tullius Cicero, consul, brilliant orator, vain, brave when it counts, hunting the conspiracy",
      "Lucius Sergius Catilina (Catiline), charismatic ruined patrician plotting revolution",
      "Gaius Julius Caesar, 37, Pontifex Maximus, deep in debt, suspected by some of sympathy with Catiline",
      "Marcus Licinius Crassus, richest man in Rome, patron of half the Senate, fire-brigade extortionist",
      "Marcus Porcius Cato, incorruptible tribune-elect, the conscience of the Senate",
      "Publius Clodius Pulcher, patrician gang leader and agitator",
      "Fulvia, a noblewoman whose lover is a conspirator, who leaks the plot to Cicero",
      "Servilia, Caesar's lover, Cato's half-sister, the sharpest political mind in the city",
      "Marcus Antonius, 20, wild young nobleman, debts and duels",
    ],
    places: ["The Forum, the Senate House, the Rostra", "The Subura slums and the Palatine mansions", "The Campus Martius and the Tiber docks", "Ostia, Capua's gladiator schools, the Via Appia", "The Tullianum prison"],
    examples: ["A Gaulish slave bought as a bodyguard by a senator, who has learned to read Latin in secret and now reads his master's letters.", "A retired centurion of Pompey's legions, back in Rome with a pension, a limp and an invitation from Catiline."],
  },
  {
    id: "vikings", name: "The Viking Age", when: "AD 866, the Great Heathen Army lands", currency: "silver", historical: true,
    blurb: "Longships on the Humber, kings with no answers, and gods who demand blood.",
    briefing: "England and the North Sea world in the autumn of 866. A Danish fleet, the Great Heathen Army led by the sons of Ragnar, has landed in East Anglia, taken horses, and is marching on York, which falls on 1 November while Northumbria's two rival kings quarrel. Anglo-Saxon England is four kingdoms of thegns, monks and ealdormen; the Danes are shield walls, seax knives, pattern-welded swords for the rich, and payment in silver by weight (hacksilver, Arab dirhams). Longships raid, trade and carry news; skalds carry reputations. Christianity and the old gods coexist and clash: relics, runes, seiðr magic, the Norns; keep the supernatural at saga level, ambiguous and ominous.",
    people: [
      "Ivar the Boneless, cunning warlord, leader of the Danish army, whose legs may or may not work",
      "Halfdan Ragnarsson and Ubba, his brothers, hungry for land and revenge",
      "Ælla and Osberht, rival kings of Northumbria who will die at York in March 867",
      "Edmund, young king of East Anglia, pious, who will be martyred by the Danes in 869",
      "Æthelred, king of Wessex, and his 17-year-old brother Alfred, not yet Great",
      "Wulfhere, Archbishop of York, a survivor who bends with the wind",
    ],
    places: ["York (Eoforwic, soon Jorvik)", "The Humber estuary and the Roman roads north", "Thetford and the East Anglian fens", "Lindisfarne and the holy islands", "Ribe and Hedeby, the Danish trading towns across the sea"],
    examples: ["A Northumbrian monk who can copy the gospels beautifully and has just watched his abbey burn, carrying the one book he saved.", "A Danish shieldmaiden's younger brother, no good with an axe, very good with a story, who talks his way onto Ivar's ship."],
  },
  {
    id: "samurai", name: "Sengoku Japan", when: "1560, the year of Okehazama", currency: "mon", historical: true,
    blurb: "Warring provinces, a rising upstart lord, and the first guns in Japan.",
    briefing: "Japan in 1560, the Warring States period. The Ashikaga shoguns rule nothing; every province is at war. In June, the young lord of Owari, Oda Nobunaga, will ambush and kill the far mightier Imagawa Yoshimoto at Okehazama in a thunderstorm, and the country's balance tips. Samurai fight with yari spears, bows and katana; matchlock guns (tanegashima) bought from Portuguese traders are changing everything. Ashigaru foot-soldiers, ninja from Iga and Kōga, warrior monks of Mount Hiei, Ikkō-ikki peasant leagues, Jesuit missionaries at Sakai. Money is copper mon on strings and rice measured in koku. Honour, debt and betrayal drive everything. Folk belief is real at the margins: yokai, onmyōji diviners, vengeful ghosts; keep it eerie and ambiguous.",
    people: [
      "Oda Nobunaga, 26, lord of Owari, called 'the fool of Owari', ruthless innovator, about to win Okehazama",
      "Imagawa Yoshimoto, powerful lord of Suruga, marching on Kyoto with 25,000 men, fond of court refinement",
      "Matsudaira Motoyasu (later Tokugawa Ieyasu), 17, Imagawa's hostage-vassal, patient and watchful",
      "Kinoshita Tōkichirō (later Toyotomi Hideyoshi), Nobunaga's sandal-bearer, a peasant's son with a brilliant mind",
      "Nōhime, Nobunaga's wife, daughter of the 'Viper of Mino', rumoured to be a spy",
      "Takeda Shingen and Uesugi Kenshin, rival warlords locked in their long duel at Kawanakajima",
      "The Portuguese traders and Jesuit priests at Sakai, selling guns and salvation",
    ],
    places: ["Kiyosu Castle and the plains of Owari", "Kyoto, the ruined capital", "Sakai, the free merchant port", "Mount Hiei's warrior monasteries", "The Tōkaidō road"],
    examples: ["A rōnin whose lord was killed at Okehazama, now selling his sword by the day, sworn to a revenge he cannot afford.", "A Sakai gunsmith's apprentice who has stolen the secret of the tanegashima trigger and knows three lords who would kill for it."],
  },
  {
    id: "pirates", name: "Golden Age of Piracy", when: "1717, the Caribbean", currency: "pieces of eight", historical: true,
    blurb: "Nassau's pirate republic, the King's pardon on the table, and Blackbeard's flag on the horizon.",
    briefing: "The Caribbean in 1717. Nassau on New Providence is a pirate republic run by captains and their crews, a year before Governor Woodes Rogers arrives to end it. The 1715 Spanish treasure fleet wrecked off Florida and salvage gold is still changing hands; in April, Sam Bellamy's Whydah went down off Cape Cod. King George's pardon is being offered to any pirate who surrenders. Ships are sloops and brigantines; weapons are flintlock pistols, cutlasses, swivel guns; crews vote on captains and sign articles; money is Spanish silver pieces of eight and gold doubloons. Slavery, sugar, the Royal Navy and the Spanish guarda costa are the powers of the sea. Superstition runs deep (Davy Jones, St Elmo's fire, cursed gold); keep it ambiguous.",
    people: [
      "Edward Teach, Blackbeard, newly captain of his own ship, cultivating a terrifying reputation with slow-burning fuses in his beard",
      "Benjamin Hornigold, senior pirate of Nassau, who refuses to attack English ships and will soon take the pardon",
      "Charles Vane, brutal, defiant, hates the idea of a pardon",
      "Jack Rackham (Calico Jack), Vane's quartermaster, a dandy with ambitions",
      "Stede Bonnet, the 'gentleman pirate', a Barbados planter who bought a ship out of boredom",
      "Henry Jennings, who raided the Spanish salvage camps and made Nassau rich",
      "Woodes Rogers, in London, planning to become Governor of the Bahamas and hang the holdouts",
    ],
    places: ["Nassau, New Providence, and its tent city of pirates", "Port Royal, Jamaica, and the Royal Navy station", "Havana and the Spanish Main", "Charles Town, Carolina", "The Florida wreck sites and the Bahama Banks"],
    examples: ["A ship's surgeon pressed off a merchantman who has discovered he is rather good at piracy and rather bad at the guilt.", "A freed woman from Port Royal who keeps a tavern in Nassau and holds every captain's secrets and half their debts."],
  },
  {
    id: "wild-west", name: "The Wild West", when: "1878, the American frontier", currency: "dollars", historical: true,
    blurb: "Cattle towns, range wars, and lawmen who used to be outlaws.",
    briefing: "The American West in 1878. Dodge City, Kansas, is the cattle capital, kept in uneasy order by assistant marshal Wyatt Earp and Ford County sheriff Bat Masterson; Doc Holliday is dealing faro nearby. In New Mexico, the Lincoln County War rages and a boy called Billy the Kid rides with the Regulators. Deadwood is a gold-rush boomtown two years after Wild Bill Hickok was shot there. The railroad, the telegraph, Colt revolvers, Winchester rifles, the Homestead Act, buffalo hunters, the Texas cattle trails, and the aftermath of the Indian Wars (Sitting Bull is in exile in Canada). Money is dollars, gold and silver coin. No magic; the frontier is dangerous enough. Treat Native nations, freedmen and immigrants as real people with their own aims, not scenery.",
    people: [
      "Wyatt Earp, assistant marshal of Dodge City, cold, ambitious, not yet a legend",
      "Bat Masterson, 24, sheriff of Ford County, gambler, dandy, quick and clever",
      "Doc Holliday, consumptive dentist, gambler, deadly and courteous",
      "Billy the Kid (Henry McCarty), 18, fighting the Lincoln County War in New Mexico",
      "John Chisum, cattle king of the Pecos, on the Kid's side of the war",
      "Jesse James, still robbing trains in Missouri with a price on his head",
      "Calamity Jane, scout, teamster and drunk in Deadwood",
      "Buffalo Bill Cody, turning the frontier into a stage show",
    ],
    places: ["Dodge City and the Long Branch Saloon", "Deadwood, Dakota Territory", "Lincoln, New Mexico Territory", "The Santa Fe Trail and the Chisholm Trail", "Tombstone's silver camp, just being staked"],
    examples: ["A Chinese railroad cook who buried a payroll in the Sierra and has finally come back for it, with a shotgun and no one to trust.", "A widowed homesteader who can outshoot the county and has been offered a deputy's badge nobody expects her to keep."],
  },
  {
    id: "victorian", name: "Victorian London", when: "1888, the autumn of the Whitechapel murders", currency: "shillings", historical: true,
    blurb: "Gaslight, fog, sensational newspapers, and something wrong in the East End.",
    briefing: "London in the autumn of 1888, the largest city on earth. In Whitechapel an unknown killer the papers call Jack the Ripper is murdering women; Inspector Abberline leads the hunt while Commissioner Sir Charles Warren is pilloried. The match-girls' strike has just been won; the docks are on the edge of revolt; spiritualism, séances and the newly founded Hermetic Order of the Golden Dawn fascinate the respectable. Hansom cabs, gas lamps, the Underground, telegraphs, music halls, the Lyceum theatre, opium dens in Limehouse, workhouses and gin. Money is pounds, shillings and pence. Class is everything. The occult may be real at the edges of this tale, but never certain.",
    people: [
      "Inspector Frederick Abberline of Scotland Yard, dogged, decent, out of his depth",
      "Sir Charles Warren, Metropolitan Police Commissioner, a soldier who does not understand the press",
      "Annie Besant, socialist, journalist, who led the match-girls to victory in July",
      "Arthur Conan Doyle, a Southsea doctor whose first Sherlock Holmes story appeared last year",
      "Bram Stoker, managing the Lyceum for the actor Henry Irving, collecting strange lore",
      "Oscar Wilde, wit of every drawing room, not yet notorious",
      "Joseph Merrick, the 'Elephant Man', living quietly at the London Hospital, Whitechapel",
      "William Booth, general of the Salvation Army, feeding the East End",
    ],
    places: ["Whitechapel, Spitalfields and Commercial Street", "Scotland Yard", "Limehouse docks and opium dens", "The Lyceum theatre and the Strand", "Mayfair drawing rooms and the Thames foreshore"],
    examples: ["A former Pinkerton detective from Chicago, hired by a London newspaper to catch the Ripper before the police do, with a past of her own to hide.", "A Whitechapel pickpocket who lifted the wrong man's watch and found a letter that could hang a gentleman."],
  },
  {
    id: "ww2", name: "World War II", when: "1943, occupied France", currency: "francs", historical: true,
    blurb: "Résistance cells, SOE radios, the Gestapo, and a country deciding what it is.",
    briefing: "Occupied France in the spring of 1943. Germany occupies the whole country; Vichy collaborates; the new forced-labour draft (STO) is driving young men into the Maquis in the hills. Britain's Special Operations Executive drops agents, radios and Sten guns by Lysander and parachute; the Gestapo and the French Milice hunt them. Jean Moulin is unifying the Resistance for de Gaulle and will be captured in Lyon in June and tortured by Klaus Barbie. Ration cards, curfews, forged papers, bicycle couriers, coded BBC messages, escape lines over the Pyrenees. Money is francs. No magic. The war is turning: Stalingrad has fallen to the Soviets, the Allies are winning in Tunisia and will land in Sicily in July. Courage here is quiet and costs everything.",
    people: [
      "Jean Moulin, de Gaulle's delegate, unifying the Resistance under a false name, months from betrayal",
      "Klaus Barbie, Gestapo chief in Lyon, the 'Butcher of Lyon'",
      "Nancy Wake, 'the White Mouse', Marseille socialite running an escape line with a five-million-franc price on her head",
      "Virginia Hall, American SOE agent with a wooden leg, organising networks in Lyon before fleeing over the Pyrenees",
      "Josephine Baker, entertainer and Free French courier carrying secrets in her sheet music",
      "Rose Valland, Louvre curator secretly logging every artwork the Nazis loot",
      "Pierre Laval, Vichy's prime minister, collaborating to the hilt",
      "Charles de Gaulle, in London and Algiers, the voice on the BBC",
    ],
    places: ["Lyon, capital of the Resistance", "Paris under the swastika", "Marseille and the Vieux-Port, dynamited in January", "The Pyrenees escape routes into Spain", "The plateaus of the Vercors and the Maquis camps"],
    examples: ["A village schoolteacher who runs the Resistance letterbox from her classroom and has just been asked to hide a wounded RAF navigator.", "A Lyon printer who forges ration cards and identity papers, and has noticed the same man watching his shop for three days."],
  },
  {
    id: "cold-war", name: "The Cold War", when: "1961, Berlin, the summer the Wall goes up", currency: "marks", historical: true,
    blurb: "Spies, defectors, a divided city, and the night the border closes.",
    briefing: "Berlin in the summer of 1961. The city is the front line: four occupation sectors, thousands fleeing East to West every week, Khrushchev threatening, Kennedy fresh from the Bay of Pigs and a bruising Vienna summit. On the night of 12-13 August, East German troops seal the border with barbed wire; the Wall follows in concrete. The Stasi under Mielke and the HVA under Markus Wolf run informers and 'Romeo' agents; the CIA, MI6 and BND run theirs; the Soviets have Penkovsky leaking to the West without knowing it. Gagarin has just orbited the earth. Trabants and Mercedes, jazz clubs and Kontrolle, dead drops, microfilm, tunnels under Bernauer Strasse, Checkpoint Charlie, the Glienicke Bridge. Money is West and East marks. No magic; trust is the only currency that matters, and it is counterfeit.",
    people: [
      "Willy Brandt, mayor of West Berlin, furious at Allied inaction",
      "Walter Ulbricht, East German leader, who said 'nobody intends to build a wall' in June",
      "Erich Mielke, minister of State Security, and Markus Wolf, spymaster whose face the West has never seen",
      "Oleg Penkovsky, Soviet colonel secretly passing missile secrets to MI6 and the CIA",
      "George Blake, MI6 officer, arrested in April as a Soviet mole, jailed for 42 years",
      "Kim Philby, in Beirut as a journalist, two years from defecting",
      "General Lucius Clay, Kennedy's envoy, who will face Soviet tanks at Checkpoint Charlie in October",
      "Conrad Schumann, the East German border guard who leaps the wire on 15 August",
    ],
    places: ["Checkpoint Charlie and Friedrichstrasse", "Bernauer Strasse, where the Wall runs through the houses", "The Glienicke Bridge of spies", "Tempelhof airport", "Stasi headquarters in Lichtenberg", "The Kurfürstendamm and its jazz clubs"],
    examples: ["An East Berlin tram driver whose sister lives three streets away on the wrong side of a border that did not exist yesterday.", "A young West German journalist who has been handed an envelope by a stranger at the Glienicke Bridge and told to deliver it by midnight."],
  },
  {
    id: "thrones", name: "Warring Thrones", when: "A Game of Thrones-style age of great houses", currency: "gold", historical: false,
    blurb: "Great houses, a contested crown, winter coming, and knives in every smile.",
    briefing: "An invented world in the spirit of A Game of Thrones: a continent of proud great houses sworn to a fragile crown, an ageing king, ambitious queens, exiled heirs across a narrow sea, a wall of ice in the north with something older behind it, and a long winter coming. Politics, debt, marriage alliances, betrayals and sudden brutal violence drive the story; dragons are a memory and magic is rare, half-believed and always costly. Invent your own houses, sigils, words, cities and characters; do not use names or characters from any published book or show. Keep it adult in stakes, PG-13 in depiction.",
    people: [
      "Archetypes to invent from: the ageing king who drinks; the queen from a rich house; the honourable lord summoned to court against his judgement; the clever dwarf or cripple nobody underestimates twice; the exiled heir across the sea with a claim and no army; the master of whisperers; the master of coin who owes more than the crown; the bastard on the Wall; the sellsword with a code",
    ],
    places: ["The capital and its throne room", "The great houses' seats, each with a sigil and words", "The Wall of ice and the wild lands beyond", "The Free Cities across the narrow sea", "Roadside inns, tourney grounds, septs and brothels"],
    examples: ["A hedge knight with a borrowed name and a real sword, riding to a tourney where the prize is a place in a great house's guard.", "A master of coin's clerk who has found the page in the ledger that explains where the crown's gold actually went."],
  },
  {
    id: "custom", name: "Custom era", when: "You decide", currency: "coin", historical: true,
    blurb: "Name any time and place. The Keeper researches it.",
    briefing: "",
    people: [],
    places: [],
    examples: ["A person of that time and place with a trade, a secret and a debt."],
  },
];

export function eraById(id: string): Era {
  return ERAS.find((e) => e.id === id) ?? ERAS[0]!;
}

export function resolveEra(id: string | undefined, custom: string | undefined): EraRef {
  const base = eraById(id ?? "classic-fantasy");
  const text = (custom ?? "").trim();
  if (base.id === "custom") {
    return { id: "custom", name: text.slice(0, 60) || "Custom era", when: "", currency: base.currency, historical: true, custom: text.slice(0, 300) };
  }
  return { id: base.id, name: base.name, when: base.when, currency: base.currency, historical: base.historical, custom: "" };
}

/** The Keeper's briefing text for an era, ready to drop into a prompt. */
export function eraBriefing(ref: EraRef): string {
  if (ref.id === "custom") {
    return `Era chosen by the player: ${ref.custom || ref.name}
This is a real historical period unless the player's words make it fictional. Before writing, recall what you know of it: the exact years, the rulers and notable people alive then, the technology, money, food, laws, beliefs and daily life. Use REAL documented people, places and events of that period in the tale; name them; keep them accurate; avoid anachronism.`;
  }
  const era = eraById(ref.id);
  const lines = [`Era: ${era.name} - ${era.when}.`, era.briefing];
  if (era.people.length) lines.push("", era.historical ? "Documented people alive and active in this year (use them as NPCs, keep them true to the record):" : "Cast to build from:", ...era.people.map((p) => `- ${p}`));
  if (era.places?.length) lines.push("", "Places:", ...era.places.map((p) => `- ${p}`));
  lines.push("", `Money is counted in ${era.currency}.`);
  return lines.join("\n");
}

/** Public shape for clients (no prompt text). */
export function eraCatalogue() {
  return ERAS.map(({ id, name, when, currency, historical, blurb, examples }) => ({ id, name, when, currency, historical, blurb, examples }));
}
