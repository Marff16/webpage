// Playing cards: the deck model, the card faces and a shuffled shoe.
// Shared by every client-side game under /pages/en/games/. Card styling lives in
// assets/css/style.css under "PLAYING CARDS".
window.Cards = (function () {
  'use strict';

  var SUITS = [
    { key: 's', glyph: '♠', red: false },
    { key: 'h', glyph: '♥', red: true  },
    { key: 'd', glyph: '♦', red: true  },
    { key: 'c', glyph: '♣', red: false }
  ];
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function hiLo(rank) {
    if (rank === '2' || rank === '3' || rank === '4' || rank === '5' || rank === '6') return 1;
    if (rank === '7' || rank === '8' || rank === '9') return 0;
    return -1; // 10 J Q K A
  }

  // Pip coordinates in percent of the pip field. `flip` mirrors the mark, as on a real card.
  var PIPS = {
    '2':  [[50, 0], [50, 100, 1]],
    '3':  [[50, 0], [50, 50], [50, 100, 1]],
    '4':  [[22, 0], [78, 0], [22, 100, 1], [78, 100, 1]],
    '5':  [[22, 0], [78, 0], [50, 50], [22, 100, 1], [78, 100, 1]],
    '6':  [[22, 0], [78, 0], [22, 50], [78, 50], [22, 100, 1], [78, 100, 1]],
    '7':  [[22, 0], [78, 0], [50, 25], [22, 50], [78, 50], [22, 100, 1], [78, 100, 1]],
    '8':  [[22, 0], [78, 0], [50, 25], [22, 50], [78, 50], [50, 75, 1], [22, 100, 1], [78, 100, 1]],
    '9':  [[22, 0], [78, 0], [22, 33], [78, 33], [50, 50], [22, 67, 1], [78, 67, 1], [22, 100, 1], [78, 100, 1]],
    '10': [[22, 0], [78, 0], [50, 17], [22, 33], [78, 33], [22, 67, 1], [78, 67, 1], [50, 83, 1], [22, 100, 1], [78, 100, 1]]
  };

  function buildFace(card) {
    var suit = card.suit;
    var face = document.createElement('div');
    face.className = 'pcard-face pcard-front' + (suit.red ? ' is-red' : '');

    face.innerHTML =
      '<span class="pc-corner pc-tl"><b>' + card.rank + '</b><i>' + suit.glyph + '</i></span>' +
      '<span class="pc-corner pc-br"><b>' + card.rank + '</b><i>' + suit.glyph + '</i></span>';

    if (card.rank === 'A') {
      face.insertAdjacentHTML('beforeend',
        '<span class="pc-centre"><span class="pc-ace">' + suit.glyph + '</span></span>');
    } else if (PIPS[card.rank]) {
      var marks = PIPS[card.rank].map(function (p) {
        return '<span class="pc-pip' + (p[2] ? ' flip' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' +
               suit.glyph + '</span>';
      }).join('');
      face.insertAdjacentHTML('beforeend', '<span class="pc-pips">' + marks + '</span>');
    } else {
      face.insertAdjacentHTML('beforeend', courtArt(card.rank));
    }
    return face;
  }

  /* Court cards — drawn as a half figure that is repeated rotated 180°, the way a real
     double-headed court card is laid out. Everything inherits the suit colour via
     currentColor, so the same art reads black or red. */
  var COURT = {
    // Each half stays inside y 4–66 so the two busts never touch across the divider at y 70.
    K: '<path d="M32 30 L36 15 L43 24 L50 10 L57 24 L64 15 L68 30 Z"/>' +
       '<path d="M46 8 h8 M50 4 v9" class="ln"/>' +
       '<rect x="31" y="30" width="38" height="6" rx="2"/>' +
       '<path d="M26 66 Q28 56 40 53 L60 53 Q72 56 74 66 Z"/>' +
       '<circle cx="50" cy="45" r="9.5" class="ln"/>' +
       '<path d="M41 47 Q50 62 59 47 Z"/>' +
       '<circle cx="46.5" cy="42.5" r="1.3" class="dot"/><circle cx="53.5" cy="42.5" r="1.3" class="dot"/>' +
       '<path d="M44 48.5 q3 -2 6 0 q3 -2 6 0" class="ln"/>' +
       '<path d="M20 66 L34 36 M27 45 L36 50" class="ln"/>',

    Q: '<path d="M33 30 C33 19 43 19 43 27 C43 16 57 16 57 27 C57 19 67 19 67 30 Z"/>' +
       '<circle cx="43" cy="17" r="2.5"/><circle cx="50" cy="13" r="2.5"/><circle cx="57" cy="17" r="2.5"/>' +
       '<rect x="32" y="30" width="36" height="6" rx="2"/>' +
       '<path d="M26 66 Q28 56 40 53 L60 53 Q72 56 74 66 Z"/>' +
       '<circle cx="50" cy="45" r="9.5" class="ln"/>' +
       '<circle cx="46.5" cy="42.5" r="1.3" class="dot"/><circle cx="53.5" cy="42.5" r="1.3" class="dot"/>' +
       '<path d="M40 42 Q33 54 37 64 M60 42 Q67 54 63 64" class="ln"/>' +
       '<path d="M28 66 L31 52" class="ln"/>' +
       '<circle cx="31" cy="47" r="2.8"/><circle cx="27" cy="50" r="2.8"/>' +
       '<circle cx="35" cy="50" r="2.8"/><circle cx="29" cy="44" r="2.8"/><circle cx="34" cy="44" r="2.8"/>',

    J: '<path d="M35 33 Q35 18 50 18 Q65 18 65 33 Z"/>' +
       '<path d="M63 26 Q75 14 82 19 Q73 26 63 29 Z"/>' +
       '<rect x="33" y="32" width="34" height="5" rx="2"/>' +
       '<path d="M26 66 Q28 58 40 55 L60 55 Q72 58 74 66 Z"/>' +
       '<circle cx="50" cy="45.5" r="9.5" class="ln"/>' +
       '<circle cx="46.5" cy="43" r="1.3" class="dot"/><circle cx="53.5" cy="43" r="1.3" class="dot"/>' +
       '<path d="M40 43 q0 -5 4 -7 M60 43 q0 -5 -4 -7" class="ln"/>' +
       '<path d="M37 55 q4 5 8 0 q4 5 8 0 q4 5 8 0" class="ln"/>' +
       '<path d="M24 66 L29 34" class="ln"/>' +
       '<path d="M29 34 L37 40 L28 44 Z"/>'
  };

  function courtArt(rank) {
    var half = COURT[rank];
    return '<span class="pc-court">' +
      '<svg class="pc-art" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        '<g>' + half + '</g>' +
        '<g transform="rotate(180 50 70)">' + half + '</g>' +
        '<line class="split" x1="10" y1="70" x2="90" y2="70"/>' +
      '</svg>' +
      // The figure turns to mush on thumbnail-sized cards, so those show the letter instead.
      '<b class="pc-court-letter">' + rank + '</b>' +
    '</span>';
  }

  function buildCard(card, width) {
    var el = document.createElement('div');
    el.className = 'pcard' + (width && width < 58 ? ' is-small' : '');
    if (width) el.style.setProperty('--cw', width + 'px');

    var flip = document.createElement('div');
    flip.className = 'pcard-flip';

    var back = document.createElement('div');
    back.className = 'pcard-face pcard-back';

    flip.appendChild(back);
    flip.appendChild(buildFace(card));
    el.appendChild(flip);
    return el;
  }

  function buildShoe(decks) {
    var shoe = [];
    for (var d = 0; d < decks; d++) {
      for (var s = 0; s < SUITS.length; s++) {
        for (var r = 0; r < RANKS.length; r++) {
          shoe.push({ rank: RANKS[r], suit: SUITS[s], value: hiLo(RANKS[r]) });
        }
      }
    }
    for (var i = shoe.length - 1; i > 0; i--) { // Fisher-Yates
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shoe[i]; shoe[i] = shoe[j]; shoe[j] = tmp;
    }
    return shoe;
  }

  return {
    SUITS: SUITS,
    RANKS: RANKS,
    hiLo: hiLo,
    buildCard: buildCard,
    buildShoe: buildShoe
  };
})();
