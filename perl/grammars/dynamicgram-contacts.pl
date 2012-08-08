#!/usr/local/bin/perl -w
use strict;
use warnings;
no warnings qw(redefine);

use Apache2::Const -compile => qw(OK HTTP_INTERNAL_SERVER_ERROR);
use Apache2::Request ();
use Apache2::RequestRec ();
use Apache2::RequestUtil ();
use Apache2::Response ();
use Geo::StreetAddress::US;

# ===========================================================================
# Global variables
# ===========================================================================
our %Directional = (
    north       => "N",
    northeast   => "NE",
    east        => "E",
    southeast   => "SE",
    south       => "S",
    southwest   => "SW",
    west        => "W",
    northwest   => "NW",
);

our %Direction_Code = reverse %Directional;

our %Street_Abbr = (
    'aly' => 'alley',
    'ally' => 'alley',
    'allee' => 'alley',
    'allyway' => 'alley',
    'allwy' => 'alley',
    'alwy' => 'alley',
    'av' => 'avenue',
    'ave' => 'avenue',
    'aven' => 'avenue',
    'avenu' => 'avenue',
    'avn' => 'avenue',
    'avnu' => 'avenue',
    'avnue' => 'avenue',
    'avs' => 'avenue',
    'aves' => 'avenue',
    'avenues' => 'avenue',
    'byu' => 'bayou',
    'bayoo' => 'bayou',
    'blf' => 'bluff',
    'bluf' => 'bluff',
    'bluffs' => 'bluff',
    'bdwk' => 'boardwalk',
    'bd' => 'boulevard',
    'bde' => 'boulevard',
    'bl' => 'boulevard',
    'bld' => 'boulevard',
    'blv' => 'boulevard',
    'blvd' => 'boulevard',
    'blvde' => 'boulevard',
    'blvrd' => 'boulevard',
    'boulavard' => 'boulevard',
    'boul' => 'boulevard',
    'boulv' => 'boulevard',
    'bvd' => 'boulevard',
    'boulevarde' => 'boulevard',
    'byp' => 'bypass',
    'bypa' => 'bypass',
    'byps' => 'bypass',
    'bywy' => 'byway',
    'canyn' => 'canyon',
    'cyn' => 'canyon',
    'cpe' => 'cape',
    'csway' => 'causeway',
    'cswy' => 'causeway',
    'causewy' => 'causeway',
    'caus' => 'causeway',
    'cause' => 'causeway',
    'cnwy' => 'centreway',
    'cir' => 'circle',
    'circ' => 'circle',
    'circl' => 'circle',
    'circel' => 'circle',
    'crc' => 'circle',
    'cirs' => 'circles',
    'circs' => 'circles',
    'circls' => 'circles',
    'circels' => 'circles',
    'clts' => 'circles',
    'crcs' => 'circles',
    'crct' => 'circuit',
    'cct' => 'circuit',
    'cirt' => 'circuit',
    'cls' => 'close',
    'clse' => 'close',
    'clde' => 'colonnade',
    'con' => 'concourse',
    'cnty rd' => 'county road',
    'ctyd' => 'courtyard',
    'cv' => 'cove',
    'cvs' => 'coves',
    'crk' => 'creek',
    'ck' => 'creek',
    'crks' => 'creeks',
    'cks' => 'creeks',
    'cr' => 'crescent',
    'cred' => 'crescent',
    'cres' => 'crescent',
    'crs' => 'crescent',
    'cresent' => 'crescent',
    'crecent' => 'crescent',
    'crst' => 'crest',
    'crsg' => 'crossing',
    'crssng' => 'crossing',
    'xing' => 'crossing',
    'crd' => 'crossroad',
    'xrd' => 'crossroad',
    'cowy' => 'crossway',
    'crwy' => 'crossway',
    'cuwy' => 'cruiseway',
    'crve' => 'curve',
    'curv' => 'curve',
    'dl' => 'dale',
    'dm' => 'dam',
    'dr' => 'drive',
    'drv' => 'drive',
    'dv' => 'drive',
    'dve' => 'drive',
    'drs' => 'drives',
    'drwy' => 'driveway',
    'drvwy' => 'driveway',
    'esp' => 'esplanade',
    'espl' => 'esplanade',
    'esplnd' => 'esplanade',
    'exp' => 'expressway',
    'expw' => 'expressway',
    'expwy' => 'expressway',
    'expy' => 'expressway',
    'extns' => 'extensions',
    'exts' => 'extensions',
    'extnsns' => 'extensions',
    'fls' => 'falls',
    'fry' => 'ferry',
    'frry' => 'ferry',
    'ftrk' => 'firetrack',
    'fitr' => 'firetrail',
    'flt' => 'flat',
    'flts' => 'flats',
    'ftwy' => 'footway',
    'frst' => 'forest',
    'forests' => 'forest',
    'forg' => 'forge',
    'frg' => 'forge',
    'frgs' => 'forges',
    'frk' => 'fork',
    'frks' => 'forks',
    'frt' => 'fort',
    'ft' => 'fort',
    'frwy' => 'freeway',
    'fw' => 'freeway',
    'fwy' => 'freeway',
    'gtes' => 'gates',
    'gtwy' => 'gateway',
    'gtwway' => 'gateway',
    'glns' => 'glens',
    'habour' => 'harbor',
    'harbour' => 'harbor',
    'harb' => 'harbor',
    'hbr' => 'harbor',
    'hbrs' => 'harbor',
    'hvn' => 'haven',
    'ht' => 'height',
    'hts' => 'heights',
    'hrd' => 'highroad',
    'hgwy' => 'highway',
    'hw' => 'highway',
    'hway' => 'highway',
    'hwy' => 'highway',
    'hi' => 'highway',
    'hy' => 'highway',
    'hc' => 'highway contract route',
    'hcr' => 'highway contract route',
    'holw' => 'hollow',
    'holws' => 'hollow',
    'holo' => 'hollow',
    'inlt' => 'inlet',
    'intg' => 'interchange',
    'intn' => 'intersection',
    'is' => 'island',
    'isl' => 'island',
    'islnd' => 'island',
    'iss' => 'islands',
    'isles' => 'isle',
    'ky' => 'key',
    'kys' => 'keys',
    'knl' => 'knoll',
    'knol' => 'knoll',
    'knls' => 'knolls',
    'lk' => 'lake',
    'lks' => 'lakes',
    'ln' => 'lane',
    'lne' => 'lane',
    'lnwy' => 'laneway',
    'lgn' => 'lagoon',
    'lagon' => 'lagoon',
    'lf' => 'loaf',
    'lck' => 'lock',
    'lcks' => 'locks',
    'loops' => 'loop',
    'mnr' => 'manor',
    'mnrs' => 'manors',
    'mdw' => 'meadow',
    'mdws' => 'meadows',
    'medows' => 'meadows',
    'mws' => 'mews',
    'mwy' => 'motorway',
    'mtwy' => 'motorway',
    'nck' => 'neck',
    'old rt' => 'old route',
    'old rte' => 'old route',
    'orch' => 'orchard',
    'orchrd' => 'orchard',
    'ovl' => 'oval',
    'opas' => 'overpass',
    'pde' => 'parade',
    'prd' => 'parade',
    'parkwy' => 'parkway',
    'pky' => 'parkway',
    'pkway' => 'parkway',
    'prkwy' => 'parkway',
    'prkway' => 'parkway',
    'pkw' => 'parkway',
    'pkwy' => 'parkway',
    'psge' => 'passage',
    'pth' => 'path',
    'phwy' => 'pathway',
    'pr' => 'pier',
    'pke' => 'pike',
    'pik' => 'pike',
    'pne' => 'pine',
    'pnes' => 'pines',
    'pln' => 'plain',
    'plns' => 'plains',
    'plz' => 'plaza',
    'plza' => 'plaza',
    'pz' => 'plaza',
    'piaz' => 'plaza',
    'piazza' => 'plaza',
    'pkt' => 'pocket',
    'pokt' => 'pocket',
    'pckt' => 'pocket',
    'pd' => 'pond',
    'prt' => 'port',
    'prts' => 'ports',
    'prr' => 'prairie',
    'prarie' => 'prairie',
    'pvt dr' => 'private drive',
    'prom' => 'promenade',
    'quy' => 'quay',
    'qy' => 'quay',
    'quays' => 'quay',
    'qys' => 'quay',
    'rad' => 'radial',
    'radl' => 'radial',
    'rnch' => 'ranch',
    'ranches' => 'ranch',
    'rnchs' => 'ranch',
    'rn' => 'ranch',
    'rpd' => 'rapid',
    'rpds' => 'rapids',
    'rdg' => 'ridge',
    'rdge' => 'ridge',
    'ridges' => 'ridge',
    'rdgs' => 'ridge',
    'rgwy' => 'ridgeway',
    'riv' => 'river',
    'rivr' => 'river',
    'rvr' => 'river',
    'rvwy' => 'riverway',
    'raod' => 'road',
    'rd' => 'road',
    'rds' => 'road',
    'roads' => 'road',
    'rdwy' => 'roadway',
    'rt' => 'route',
    'rte' => 'route',
    'routes' => 'route',
    'rts' => 'route',
    'rtes' => 'route',
    'r d' => 'rural delivery',
    'rr' => 'rural route',
    'r r' => 'rural route',
    'swy' => 'serviceway',
    'shl' => 'shoal',
    'shls' => 'shoals',
    'shr' => 'shore',
    'shoar' => 'shore',
    'shrs' => 'shores',
    'shoars' => 'shores',
    'skwy' => 'skyway',
    'spg' => 'spring',
    'spng' => 'spring',
    'sprng' => 'spring',
    'spgs' => 'springs',
    'spngs' => 'springs',
    'sprngs' => 'springs',
    'sq' => 'square',
    'sqr' => 'square',
    'sqre' => 'square',
    'squ' => 'square',
    'sqrs' => 'squares',
    'sqs' => 'squares',
    'state hwy' => 'state highway',
    'shwy' => 'state highway',
    'state highway no' => 'state highway number',
    'state highway num' => 'state highway number',
    'state hwy number' => 'state highway number',
    'state hwy no' => 'state highway number',
    'state hwy num' => 'state highway number',
    'shwy number' => 'state highway number',
    'shwy no' => 'state highway number',
    'shwy num' => 'state highway number',
    'sr' => 'state road',
    'state rd' => 'state road',
    'state rt' => 'state route',
    'state rte' => 'state route',
    'state route no' => 'state route number',
    'stra' => 'strand',
    'strnd' => 'strand',
    'strav' => 'stravenue',
    'strave' => 'stravenue',
    'straven' => 'stravenue',
    'stravn' => 'stravenue',
    'strvn' => 'stravenue',
    'strvnue' => 'stravenue',
    'strm' => 'stream',
    'streme' => 'stream',
    'st' => 'street',
    'str' => 'street',
    'streets' => 'street',
    'stret' => 'street',
    'strets' => 'street',
    'sty' => 'street',
    'sstreet' => 'street',
    'sstreets' => 'street',
    'sts' => 'street',
    'strp' => 'strip',
    'sbwy' => 'subway',
    'sumt' => 'summit',
    'smt' => 'summit',
    'sumit' => 'summit',
    'ter' => 'terrace',
    'terr' => 'terrace',
    'tce' => 'terrace',
    'terace' => 'terrace',
    'terrac' => 'terrace',
    'terrance' => 'terrace',
    'terrrace' => 'terrace',
    'trce' => 'terrace',
    'trwy' => 'throughway',
    'thrwy' => 'throughway',
    'thruway' => 'throughway',
    'thor' => 'thoroughfare',
    'tlwy' => 'tollway',
    'trc' => 'trace',
    'trfy' => 'trafficway',
    'tr' => 'trail',
    'trl' => 'trail',
    'trails' => 'trail',
    'trls' => 'trail',
    'tkwy' => 'trunkway',
    'tunel' => 'tunnel',
    'tunl' => 'tunnel',
    'tunls' => 'tunnel',
    'tunnels' => 'tunnel',
    'tpk' => 'turnpike',
    'tpke' => 'turnpike',
    'trpk' => 'turnpike',
    'trnpk' => 'turnpike',
    'turnpk' => 'turnpike',
    'upas' => 'underpass',
    'us hwy' => 'us highway',
    'us highway no' => 'us highway number',
    'us highway num' => 'us highway number',
    'us hwy no' => 'us highway number',
    'us hwy num' => 'us highway number',
    'u s hwy no' => 'us highway number',
    'us rt' => 'us route',
    'us rte' => 'us route',
    'vly' => 'valley',
    'vally' => 'valley',
    'vlly' => 'valley',
    'vlys' => 'valleys',
    'via' => 'viaduct',
    'vdct' => 'viaduct',
    'viadct' => 'viaduct',
    'vws' => 'views',
    'vl' => 'ville',
    'vlg' => 'village',
    'vis' => 'vista',
    'vist' => 'vista',
    'vst' => 'vista',
    'vsta' => 'vista',
    'wk' => 'walk',
    'wlk' => 'walk',
    'walks' => 'walk',
    'wkwy' => 'walkway',
    'wls' => 'wells',
    'whf' => 'wharf',
    'whrf' => 'wharf',
    'arc' => 'arcade',
    'basn' => 'basin',
    'ba' => 'bay',
    'baby' => 'bay',
    'bat' => 'bay',
    'baech' => 'beach',
    'bch' => 'beach',
    'beech' => 'beach',
    'bnd' => 'bend',
    'bot' => 'bottom',
    'bottm' => 'bottom',
    'btm' => 'bottom',
    'bttm' => 'bottom',
    'bttms' => 'bottoms',
    'btms' => 'bottoms',
    'bottms' => 'bottoms',
    'br' => 'branch',
    'brnch' => 'branch',
    'brdg' => 'bridge',
    'brdge' => 'bridge',
    'brg' => 'bridge',
    'bdge' => 'bridge',
    'brk' => 'brook',
    'brks' => 'brooks',
    'cp' => 'camp',
    'cmp' => 'camp',
    'cen' => 'center',
    'ctr' => 'center',
    'cent' => 'center',
    'cntr' => 'center',
    'centr' => 'center',
    'centre' => 'center',
    'cente' => 'center',
    'ctrs' => 'centers',
    'centrs' => 'centers',
    'centres' => 'centers',
    'clf' => 'cliff',
    'clfs' => 'cliffs',
    'clb' => 'club',
    'cmn' => 'common',
    'cmns' => 'commons',
    'cor' => 'corner',
    'cnr' => 'corner',
    'crn' => 'corner',
    'crnr' => 'corner',
    'cors' => 'corners',
    'crse' => 'course',
    'crt' => 'court',
    'ct' => 'court',
    'crts' => 'courts',
    'cts' => 'courts',
    'crss' => 'cross',
    'cros' => 'cross',
    'est' => 'estate',
    'ests' => 'estates',
    'fld' => 'field',
    'flds' => 'fields',
    'frd' => 'ford',
    'frds' => 'fords',
    'gte' => 'gate',
    'gdn' => 'garden',
    'grd' => 'garden',
    'grdn' => 'garden',
    'gardn' => 'garden',
    'gdns' => 'gardens',
    'grds' => 'gardens',
    'grdns' => 'gardens',
    'gardns' => 'gardens',
    'gln' => 'glen',
    'grn' => 'green',
    'grns' => 'greens',
    'gr' => 'grove',
    'grv' => 'grove',
    'grve' => 'grove',
    'grvs' => 'groves',
    'hl' => 'hill',
    'hls' => 'hills',
    'jct' => 'junction',
    'jctn' => 'junction',
    'jnc' => 'junction',
    'jnct' => 'junction',
    'jtn' => 'junction',
    'jubction' => 'junction',
    'junct' => 'junction',
    'jcts' => 'junctions',
    'jctns' => 'junctions',
    'jncs' => 'junctions',
    'jncts' => 'junctions',
    'jtns' => 'junctions',
    'juncts' => 'junctions',
    'lndg' => 'landing',
    'lndng' => 'landing',
    'ldg' => 'landing',
    'lgt' => 'light',
    'lights' => 'light',
    'lgts' => 'light',
    'lodg' => 'lodge',
    'ml' => 'mill',
    'mls' => 'mills',
    'msn' => 'mission',
    'mssn' => 'mission',
    'pk' => 'park',
    'prk' => 'park',
    'parks' => 'park',
    'pl' => 'place',
    'pla' => 'place',
    'plc' => 'place',
    'piont' => 'point',
    'pnt' => 'point',
    'pt' => 'point',
    'pnts' => 'points',
    'pts' => 'points',
    'res' => 'reserve',
    'resrv' => 'reserve',
    'resv' => 'reserve',
    'rsrv' => 'reserve',
    'rserv' => 'reserve',
    'rserve' => 'reserve',
    'rsrve' => 'reserve',
    'rst' => 'rest',
    'sta' => 'station',
    'statn' => 'station',
    'stn' => 'station',
    'trk' => 'track',
    'trak' => 'track',
    'trks' => 'track',
    'traks' => 'track',
    'tracks' => 'track',
    'un' => 'union',
    'vw' => 'view',
    'wtr' => 'waters',
    'wtrs' => 'waters',
    'wy' => 'way',
    'ways' => 'way',
    'wl' => 'well',
    'yd' => 'yard',
    'yrd' => 'yard'
);

our %NUMBERS =
(
    '0' => 'zero',
    '1' => 'one',
    '2' => 'two',
    '3' => 'three',
    '4' => 'four',
    '5' => 'five',
    '6' => 'six',
    '7' => 'seven',
    '8' => 'eight',
    '9' => 'nine',
   '10' => 'ten',
   '11' => 'eleven',
   '12' => 'twelve',
   '13' => 'thirteen',
   '14' => 'fourteen',
   '15' => 'fifteen',
   '16' => 'sixteen',
   '17' => 'seventeen',
   '18' => 'eighteen',
   '19' => 'nineteen',
   '20' => 'twenty',
   '30' => 'thirty',
   '40' => 'forty',
   '50' => 'fifty',
   '60' => 'sixty',
   '70' => 'seventy',
   '80' => 'eighty',
   '90' => 'ninety',
  '100' => 'one hundred',
  '200' => 'two hundred',
  '300' => 'three hundred',
  '400' => 'four hundred',
  '500' => 'five hundred',
  '600' => 'six hundred',
  '700' => 'seven hundred',
  '800' => 'eight hundred',
  '900' => 'nine hundred',
);

our %ORDINAL_NUMBERS =
(
    '1' => 'first',
    '2' => 'second',
    '3' => 'third',
    '4' => 'fourth',
    '5' => 'fifth',
    '6' => 'sixth',
    '7' => 'seventh',
    '8' => 'eighth',
    '9' => 'nineth',
   '10' => 'tenth',
);

use constant GRXML => << 'End';
<?xml version= "1.0"?>
<grammar mode="voice"
         root="main"
         tag-format="semantics/1.0"
         version="1.0"
         xml:lang="en-us"
         xmlns="http://www.w3.org/2001/06/grammar">
    %s
</grammar>
End

use constant SEARCH_GRXML => << 'End';
 <rule id="main" scope="public">
  <one-of>
    <item>yes<tag>out="yes"</tag></item>
    <item>no<tag>out="no"</tag></item>
    <item>
        no the
        <one-of>
            <item repeat="0-1">closest</item>
            <item repeat="0-1">nearest</item>
        </one-of>
        <ruleref uri="#websearch"/>
        <tag>out='no,' + rules.latest();</tag>
    </item>
    <item>
        yes the one in
        <ruleref uri="#websearch"/>
        <tag>out='yes,' + rules.latest();</tag>
    </item>
    <item><ruleref uri="#websearch"/><tag>out=rules.latest();</tag></item>
  </one-of>
 </rule>
 <rule id="websearch" scope="private">
  <item><ruleref uri="http://gs1.tm-dev.reco.tellme.com/websearch"/></item>
 </rule>
End

use constant LISTING_GRXML => << 'End';
 <rule id="main" scope="public">
  <one-of>
    <item>
        no the
        <one-of>
            <item repeat="0-1">closest</item>
            <item repeat="0-1">nearest</item>
        </one-of>
        <ruleref uri="#websearch"/>
        <tag>out='no,' + rules.latest();</tag>
    </item>
    %s
  </one-of>
 </rule>
 <rule id="websearch" scope="private">
  <item><ruleref uri="http://gs1.tm-dev.reco.tellme.com/websearch"/></item>
 </rule>
End

use constant DETAILS_GRXML => << 'End';
 <rule id="main" scope="public">
  <one-of>
    <item>connect me<tag>out="connect";</tag></item>
    <item>different location<tag>out="different";</tag></item>
    <item>
        <item repeat="0-1">get</item>
        directions
        <tag>out="directions";</tag>
    </item>
    <item>departure alert<tag>out="alert";</tag></item>
    <item>
        no the
        <one-of>
            <item repeat="0-1">closest</item>
            <item repeat="0-1">nearest</item>
        </one-of>
        <ruleref uri="#websearch"/>
        <tag>out='no,' + rules.latest();</tag>
    </item>
    %s
  </one-of>
 </rule>
 <rule id="websearch" scope="private">
  <item><ruleref uri="http://gs1.tm-dev.reco.tellme.com/websearch"/></item>
 </rule>
End

use constant DIRECTIONS_GRXML => << 'End';
 <rule id="main" scope="public">
  <one-of>
    <item>share <item repeat="0-1">directions</item><tag>out="share";</tag></item>
    <item>departure alert<tag>out="alert";</tag></item>
    %s
  </one-of>
 </rule>
End

use constant SHARE_GRXML => << 'End';
 <rule id="main" scope="public">
  <one-of>
    <item>send <one-of><item><item repeat="0-1">text</item> message</item><item>s m s</item></one-of><tag>out="sms";</tag></item>
    <item>send <one-of><item><item repeat="0-1">text</item> message</item><item>s m s</item></one-of> to all<tag>out="sms,*";</tag></item>
    <item>send email<tag>out="email";</tag></item>
    <item>send email to all<tag>out="email,*";</tag></item>
    <item>share with <one-of><item>all</item><item>everyone</item></one-of><tag>out="*";</tag></item>
    <item>add <one-of><item>other</item><item>another</item></one-of> contact<tag>out="addother";</tag></item>
    <item>share with all<tag>out="*";</tag></item>
    %s
  </one-of>
 </rule>
End

use constant CONTACTS_GRXML => << 'End';
 <rule id="main" scope="public">
  <one-of>
    %s
  </one-of>
 </rule>
End

use constant WEBSEARCH => << 'End';
    <ruleref uri="http://gs1.tm-dev.reco.tellme.com/websearch"/><tag>out=rules.latest()</tag>
End

use constant ITEM => << 'End';
    <item>%s<tag>out="%s";</tag></item>
End

use constant OPTIONAL => << 'End';
    <item repeat="0-1">%s</item>
End

use constant PICK => << 'End';
    the %s one
End

use constant CITY => << 'End';
    the one in %s
End

use constant STREET => << 'End';
    the one on %s
End

use constant CONNECT_STREET => << 'End';
    connect me with the one on %s
End

use constant SHARE => << 'End';
    share with %s %s
End

use constant EMAIL => << 'End';
    send email to %s <item repeat="0-1">%s</item>
End

use constant SMS => << 'End';
    send <one-of><item><item repeat="0-1">text</item> message</item><item>s m s</item></one-of> to %s <item repeat="0-1">%s</item>
End

my %xml_entity_map   = qw(& amp < lt > gt " quot ' apos);

sub xml_escape($) {
    local $_ = shift;
    defined $_ or return;
    s/[&<>"']/\&$xml_entity_map{$&};/g;
    return $_;
}

our $R            = shift;
our $APR          = Apache2::Request->new($R);

our $TOKEN        = "token";
our $CITY         = "city";
our $ADDRESS      = "address";
our $NAME         = "name";
our $NS           = "n";
our $TAG          = "tag";
our $NAME_TAG     = "tag.name";
our $MAX_TOKENS   = 50;

$R->no_cache(1);                  # Send Pragma and Cache-Control headers

# ===========================================================================
# Main body
# ===========================================================================
{
    my ($num, $items, $type, $grxml);
    $grxml = '';

# ===========================================================================
# 1. Parse parameters
# ===========================================================================
    $type = $APR->param('type');

# ===========================================================================
# 2. Get tokens and tags
# ===========================================================================
    if ($type eq 'search') {
        $grxml = SEARCH_GRXML;
    } elsif ($type eq 'listing') {
        $num = 0;
        $items = '';
        while ($num < $MAX_TOKENS) {
            my $city = $APR->param("$CITY.$num");
            last unless $city;
            
            my $address_str = $APR->param("$ADDRESS.$num");
            last unless $address_str;

            # if no tag, default to the item number
            my $tag = $APR->param("$TAG.$num") || $num;

            my $address_token = '';
            my $address = Geo::StreetAddress::US->parse_location($address_str);
            unless ($address) {
                return error("Unable to parse address: $address_str");
            }

            my ($addr_number, $addr_prefix, $addr_street, $addr_type, $addr_suffix) = 
                @{$address}{qw(number prefix street type suffix)};
            if (defined $addr_number) {
                $address_token .= sprintf OPTIONAL, build_street_number($addr_number);
            }
            if ($addr_prefix) {
                $address_token .= sprintf OPTIONAL, $Direction_Code{uc $addr_prefix} || $addr_prefix;
            }
            if ($addr_street) {
                $address_token .= $addr_street;
            }
            if ($addr_type) {
                $address_token .= sprintf OPTIONAL, $Street_Abbr{lc $addr_type} || $addr_type;
            }
            if ($addr_suffix) {
                $address_token .= sprintf OPTIONAL, $Direction_Code{uc $addr_suffix} || $addr_suffix;
            }

            ($tag, $city, $address_token) = map {xml_escape($_)} ($tag, $city, $address_token); 
            $items .= sprintf(ITEM, 
                        sprintf(PICK, $ORDINAL_NUMBERS{$num+1}), $tag) . "\n";
            $items .= sprintf(ITEM, 
                        sprintf(CITY, lc $city), $tag) . "\n";
            $items .= sprintf(ITEM, 
                        sprintf(STREET, lc $address_token), $tag) . "\n";
            $items .= sprintf(ITEM, 
                        sprintf(CONNECT_STREET, lc $address_token), "connect,$tag") . "\n";
            $num++;
        }
        $grxml = sprintf LISTING_GRXML, $items;
    } elsif ($type eq 'details') {
        $num = 0;
        $items = '';
        while ($num < $MAX_TOKENS) {
            my $city = $APR->param("$CITY.$num");
            last unless $city;
            
            my $address_str = $APR->param("$ADDRESS.$num");
            last unless $address_str;

            # if no tag, default to the item number
            my $tag = $APR->param("$TAG.$num") || $num;

            my $address_token = '';
            my $address = Geo::StreetAddress::US->parse_location($address_str);
            unless ($address) {
                return error("Unable to parse address: $address_str");
            }

            my ($addr_number, $addr_prefix, $addr_street, $addr_type, $addr_suffix) = 
                @{$address}{qw(number prefix street type suffix)};
            if (defined $addr_number) {
                $address_token .= sprintf OPTIONAL, build_street_number($addr_number);
            }
            if ($addr_prefix) {
                $address_token .= sprintf OPTIONAL, $Direction_Code{uc $addr_prefix} || $addr_prefix;
            }
            if ($addr_street) {
                $address_token .= $addr_street;
            }
            if ($addr_type) {
                $address_token .= sprintf OPTIONAL, $Street_Abbr{lc $addr_type} || $addr_type;
            }
            if ($addr_suffix) {
                $address_token .= sprintf OPTIONAL, $Direction_Code{uc $addr_suffix} || $addr_suffix;
            }

            ($tag, $city, $address_token) = map {xml_escape($_)} ($tag, $city, $address_token); 
            $items .= sprintf(ITEM, 
                        sprintf(CITY, lc $city), $tag) . "\n";
            $items .= sprintf(ITEM, 
                        sprintf(STREET, lc $address_token), $tag) . "\n";

            # handle name
            my $name = $APR->param("$NAME.$num");
            my $name_tag = $APR->param("$NAME_TAG.$num") || "share,$num";
            if ($name) {
                my ($first, $last) = $name =~ m/(\S+)(?:\s+(.+))?/g; 
                next unless $first;
                my $last_gr = last_name_grammar($last);
                $items .= sprintf(ITEM, 
                            sprintf(SHARE, lc xml_escape($first), xml_escape($last_gr)), 
                                           xml_escape($name_tag)) . "\n";
            }

            $num++;
        }
        $grxml = sprintf DETAILS_GRXML, $items;
    } elsif ($type eq 'directions') {
        $num = 0;
        $items = '';
        while ($num < $MAX_TOKENS) {
            # handle name
            my $name = $APR->param("$NAME.$num");
            last unless $name;

            my $name_tag = $APR->param("$NAME_TAG.$num") || "share,$num";
            my ($first, $last) = $name =~ m/(\S+)(?:\s+(.+))?/g; 
            next unless $first;
            my $last_gr = last_name_grammar($last);

            $items .= sprintf(ITEM, 
                        sprintf(SHARE, lc xml_escape($first), xml_escape($last_gr)),
                                       xml_escape($name_tag)) . "\n";
            $num++;
        }
        $grxml = sprintf DIRECTIONS_GRXML, $items;
    } elsif ($type eq 'share') {
        $num = 0;
        $items = '';
        while ($num < $MAX_TOKENS) {
            my $name = $APR->param("$NAME.$num");
            last unless $name;
            
            my $tag = $APR->param("$TAG.$num") || $num;
            my ($first, $last) = $name =~ m/(\S+)(?:\s+(.+))?/g; 
            next unless $first;
            my $last_gr = last_name_grammar($last);

            ($tag, $first, $last_gr) = map {xml_escape($_)} ($tag, $first, $last_gr); 
            $items .= sprintf(ITEM, 
                        sprintf(SHARE, lc $first, $last_gr), $tag) . "\n";
            $items .= sprintf(ITEM, 
                        sprintf(EMAIL, lc $first, $last_gr), "email,$tag") . "\n";
            $items .= sprintf(ITEM, 
                        sprintf(SMS, lc $first, $last_gr), "sms,$tag") . "\n";
            $num++;
        }
        $grxml = sprintf SHARE_GRXML, $items;
    } elsif ($type eq 'contacts') {
        $num = 0;
        $items = '';
        while (1) {
            my $name = $APR->param("$NS.$num");
            last unless $name;
            
            my $tag = $APR->param("$TAG.$num") || $num;

            ($tag, $name) = map {xml_escape($_)} ($tag, $name); 
            $items .= sprintf(ITEM, lc $name, $tag) . "\n";
            $num++;
        }
        $grxml = sprintf CONTACTS_GRXML, $items;
    }

# ===========================================================================
# 3. return grammar
# ===========================================================================
    $R->content_type('text/xml');
    $R->print(sprintf GRXML, $grxml);
    return Apache2::Const::OK;
}

sub last_name_grammar {
    my $last_name = shift;
    my $grammar = '';
    if ($last_name) {
        $grammar = sprintf OPTIONAL, lc $last_name;
    }
    return $grammar;
}

# The following adapted from DA and Dominos.
sub build_street_number {
    my $num = shift;
    my $text = '';
  
    # drop leading zeros:
    $num =~ s/^0+(\d.*)/$1/;
  
    my @tokenized_number = tokenize_number($num);
  
    for(my $i=0; $i<@tokenized_number; $i++) {
        my $token_type = $tokenized_number[$i]->{t};
        my $token_value = $tokenized_number[$i]->{v};
        my $token_text = undef;
  
        if($token_type eq 'fraction') {
            $token_text = build_fraction_tts($token_value);
        } elsif($token_type eq 'numbers') {
            $token_text = build_number_tts($token_value);
        } else {
            # error, unknown token type
            $token_text = undef;
        }
  
        $text .= "$token_text " if $token_text;
    } # loop through tokens
  
    return $text;
}

sub build_fraction_tts {
    my $fraction = shift;
    my $fractts;
  
    if ($fraction eq '1/2') {
        $fractts = 'one half';
    } elsif ($fraction eq '1/4') {
        $fractts = 'one quarter';
    } elsif ($fraction eq '3/4') {
        $fractts = 'three quarters';
    }
    
    return $fractts;
}

sub build_number_tts {
    my $number = shift;
    my $tts = '';
    my $prefix;
    my $suffix;
  
    if (length $number < 4 || $number =~ m/^\d\d00$/) {
        # 1-999, 1000, 2000, ..., 9000, 1100, 1200, ..., 9900:
        $tts .= spell_number($number);
    } elsif (length $number == 4) {
        # 1001-9999, excluding 1100, 1200, ..., 9900:
        $prefix = substr($number, 0, 2);
        $suffix = substr($number, 2, 2);
  
        $tts .= spell_number($prefix) . " ";
        $tts .= spell_number($suffix);
    } else {
        # 10000 (5 digits) and greater
  
        # here, we just want to process in twos, any digits that are preventing
        # the length of the number (in digits) from being a multiple of 3.
        while((length $number) % 3 != 0) {
          # play back the first two digits
          $prefix = substr($number, 0, 2);
          $tts .= spell_supernumber($prefix) . " ";
  
          # now only interpret the rest of the string
          $number = substr($number, 2);
        }
  
        #
        # by here, the number of digits in $number should be a multiple of 3,
        # so just take them three at a time
        #
        while($number) {
            $prefix = substr($number, 0, 3);
            $tts .= spell_supernumber($prefix) . " ";
            $number = substr($number, 3);
        }
    }
  
    return $tts;
}

sub tokenize_number {
  my $number = shift;
  my @tokens = ();

  if(!$number) {
    return @tokens;
  }

  # convert letters to upper
  my $input_string = uc $number;

  # replace all irrelevant characters to spaces
  $input_string =~ s/[^A-Za-z0-9\/]/ /g;

  my $is_tokenizing = 1;

  # FractionPattern = /^\s*(\d+\/\d+)/
  # NumbersPattern = /^\s*(\d+)/
  # LettersPattern = /^\s*([A-Z]+)/
  # SpacesPattern = /^\s*$/

  while($is_tokenizing) {

    #
    # must search in this order, because the numbers pattern is
    # a subset of the fraction pattern
    #
    if($input_string =~ m|^\s*(\d+/\d+)|) {

      #
      # can only read back 1/4, 1/2, and 3/4, so if not
      # one of those fractions, strip the '/' and read as
      # two numbers
      #
      if($1 eq '1/2' || $1 eq '1/4' || $1 eq '3/4') {

        #
        # Recognized the fraction as a token.  Push it on our
        # list of tokens and remove the pattern from the string
        #
        # $+[0] is the index following the matched pattern
        #
        push @tokens, {'t' =>'fraction', 'v' => $1};
        $input_string = substr($input_string, $+[0]);

      } else {
        #
        # just replace the first slash encountered with a space
        #
        $input_string =~ s|/| |;
      }

    } elsif($input_string =~ m/^\s*(\d+)/) {
      #
      # Recognize number token
      #
      push @tokens, {'t' => 'numbers', 'v' => $1};
      $input_string = substr($input_string, $+[0]);

    } elsif($input_string =~ m/^\s*([A-Z]+)/) {
      #
      # Recognize letter token
      #
      push @tokens, {'t' => 'letters', 'v' => $1};
      $input_string = substr($input_string, $+[0]);

    } elsif($input_string =~ m/^\s*$/) {
      #
      # only spaces left, done here
      #
      $is_tokenizing = 0;

    } else {
      #
      # discard character and continue... most likely a leading slash
      #
      $input_string = substr($input_string, 1);
    }
  }

  return @tokens;
}

sub spell_number
{
  my $num = shift || return '';
  # this algorithm was originally written by B.J.

  # Drop leading zeroes, except in /^0[1-9]?$/:
  $num =~ s/^0+$/0/;
  $num =~ s/^00+([1-9])$/$1/;
  $num =~ s/^0+([1-9]\d)/$1/;

  if ($num =~ m/^0([1-9])$/) {
    return ('oh ' . $NUMBERS{$1});
  }

  if ($num =~ m/^1?[0-9]$/) {
    return $NUMBERS{$num};
  }

  if ($num =~ m/^([2-9])(\d)$/) {
    if ($2 eq '0') {
      return $NUMBERS{$num};
    }

    return ($NUMBERS{$1 . '0'} . ' ' . $NUMBERS{$2});
  }

  if ($num =~ m/^([1-9])(\d\d)$/) {
    my $hundred = $1;
    my $decasingle = $2;
    if ($decasingle eq '00') {
      return ($NUMBERS{$hundred} . ' hundred');
    }

    return ($NUMBERS{$hundred} . ' ' . spell_number($decasingle));
  }

  if ($num =~ m/^([1-9])000$/) {
    my $thousand = $1;
    return ($NUMBERS{$thousand} . ' thousand');
  }

  if ($num =~ m/^([1-9]\d)00$/) {
    my $hundred = $1;
    return (($NUMBERS{$hundred} || spell_number($hundred)) . ' hundred');
  }

  return $num;
}

sub spell_supernumber {

  my $number = shift || return '';
  my $spelled = '';

  my @digits = split(//, $number);
  foreach my $digit (@digits) {
    $spelled .= $NUMBERS{$digit} || '';
    $spelled .= ' ';
  }
  chop $spelled;

  return $spelled;
}

sub error {
    my ($err) = @_;
    $R->content_type('text/plain');
    $R->status(Apache2::Const::HTTP_INTERNAL_SERVER_ERROR);
    $R->custom_response(Apache2::Const::HTTP_INTERNAL_SERVER_ERROR, $err);
    return Apache2::Const::OK;
}

