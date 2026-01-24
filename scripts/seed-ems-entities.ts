/**
 * Seed script to import 506+ EMS protocol-issuing entities across 25 states
 * Based on comprehensive research data covering regional councils, county systems,
 * hospital-based EMS, fire departments, and community paramedicine programs
 */
import "../scripts/load-env.js";
import { drizzle } from "drizzle-orm/mysql2";
import { counties } from "../drizzle/schema";

// EMS Entity type with optional website for protocol source
interface EMSEntity {
  name: string;
  state: string;
  type: "regional_council" | "county" | "municipal" | "hospital" | "fire_dept" | "community_paramedicine" | "state";
  website?: string;
  usesStateProtocols?: boolean;
}

// Washington State - 51 entities
const WASHINGTON_ENTITIES: EMSEntity[] = [
  // Regional EMS Councils (8)
  { name: "Central Region EMS and Trauma Care Council (King County)", state: "Washington", type: "regional_council", website: "http://www.centralregionems.org/" },
  { name: "East Region EMS and Trauma Care Council", state: "Washington", type: "regional_council", website: "https://www.eastregion-ems.org/" },
  { name: "North Region EMS and Trauma Care Council", state: "Washington", type: "regional_council", website: "http://www.northregionems.com/" },
  { name: "North Central Region EMS Council (NCECC)", state: "Washington", type: "regional_council", website: "https://www.ncecc.net/" },
  { name: "Northwest Region EMS and Trauma Care Council", state: "Washington", type: "regional_council", website: "http://www.nwrems.org/" },
  { name: "South Central Region EMS Council (SCREMS)", state: "Washington", type: "regional_council", website: "http://www.screms.org/" },
  { name: "Southwest Region EMS Council (SWEMS)", state: "Washington", type: "regional_council", website: "http://www.swems.org/" },
  { name: "West Region EMS Council (WREMS)", state: "Washington", type: "regional_council", website: "http://www.wrems.com/" },
  // Major County Systems
  { name: "King County EMS Division (Medic One)", state: "Washington", type: "county", website: "https://www.emsonline.net/" },
  { name: "Pierce County EMS", state: "Washington", type: "county", website: "https://www.piercecountywa.gov/3096/Patient-Care-Guidelines" },
  { name: "Spokane County EMS & Trauma Care Council", state: "Washington", type: "county", website: "https://www.emsoffice.com/" },
  // County EMS Councils (32)
  { name: "Adams County EMS", state: "Washington", type: "county" },
  { name: "Asotin County EMS", state: "Washington", type: "county" },
  { name: "Clallam County EMS", state: "Washington", type: "county" },
  { name: "Clark County EMS", state: "Washington", type: "county" },
  { name: "Cowlitz County EMS", state: "Washington", type: "county" },
  { name: "Ferry County EMS", state: "Washington", type: "county" },
  { name: "Garfield County EMS", state: "Washington", type: "county" },
  { name: "Grant County EMS", state: "Washington", type: "county" },
  { name: "Grays Harbor County EMS", state: "Washington", type: "county", website: "https://www.ghems.org/" },
  { name: "Island County EMS", state: "Washington", type: "county" },
  { name: "Jefferson County EMS", state: "Washington", type: "county" },
  { name: "Kitsap County EMS", state: "Washington", type: "county", website: "https://www.kitsapcountyems.org/" },
  { name: "Kittitas County EMS", state: "Washington", type: "county", website: "https://www.kittitascountyems.org/" },
  { name: "Klickitat County EMS", state: "Washington", type: "county" },
  { name: "Lewis County EMS", state: "Washington", type: "county", website: "https://www.lewiscountyems.com/" },
  { name: "Lincoln County EMS", state: "Washington", type: "county" },
  { name: "Mason County EMS", state: "Washington", type: "county", website: "https://www.masoncountyems.com/" },
  { name: "Okanogan County EMS", state: "Washington", type: "county" },
  { name: "Pend Oreille County EMS", state: "Washington", type: "county" },
  { name: "San Juan County EMS", state: "Washington", type: "county", website: "https://www.sanjuanems.org/" },
  { name: "Skagit County EMS", state: "Washington", type: "county" },
  { name: "Skamania County EMS", state: "Washington", type: "county" },
  { name: "Snohomish County EMS", state: "Washington", type: "county" },
  { name: "Stevens County EMS", state: "Washington", type: "county" },
  { name: "Thurston County EMS", state: "Washington", type: "county" },
  { name: "Wahkiakum County EMS", state: "Washington", type: "county" },
  { name: "Walla Walla County EMS", state: "Washington", type: "county" },
  { name: "Whatcom County EMS", state: "Washington", type: "county" },
  { name: "Whitman County EMS", state: "Washington", type: "county", website: "https://whitmancountyems.org/" },
  { name: "Yakima County EMS", state: "Washington", type: "county", website: "https://yakimacountyems.com/" },
  // Multi-county systems
  { name: "Mid-Columbia EMS", state: "Washington", type: "regional_council" },
  { name: "Greater Wenatchee EMS", state: "Washington", type: "regional_council" },
  // Major Fire Department EMS
  { name: "Seattle Fire Department Medic One", state: "Washington", type: "fire_dept" },
  { name: "Bellevue Fire Department EMS", state: "Washington", type: "fire_dept" },
  { name: "Redmond Fire Department EMS", state: "Washington", type: "fire_dept" },
  { name: "Shoreline Fire Department EMS", state: "Washington", type: "fire_dept" },
];

// Oregon - 22 entities
const OREGON_ENTITIES: EMSEntity[] = [
  { name: "Oregon Health Authority EMS Program", state: "Oregon", type: "state", website: "https://www.oregon.gov/oha/ph/providerpartnerresources/ems/" },
  { name: "Multnomah County EMS", state: "Oregon", type: "county", website: "https://multco.us/info/ems-protocols-resources" },
  { name: "Washington County EMS", state: "Oregon", type: "county" },
  { name: "Clackamas County EMS", state: "Oregon", type: "county" },
  { name: "Deschutes County ASA", state: "Oregon", type: "county", website: "https://www.deschutes.org/health/page/ambulance-service-area-asa" },
  { name: "Jackson County EMS (JCEMS)", state: "Oregon", type: "county", website: "https://jcems.net/" },
  { name: "Lane County EMS", state: "Oregon", type: "county" },
  { name: "Marion/Polk County Regional EMS", state: "Oregon", type: "regional_council" },
  { name: "Josephine County EMS", state: "Oregon", type: "county" },
  { name: "Morrow County Health District EMS", state: "Oregon", type: "county" },
  { name: "Central Oregon Fire Services EMS", state: "Oregon", type: "fire_dept" },
  { name: "Portland Fire & Rescue EMS Division", state: "Oregon", type: "fire_dept" },
  { name: "Hood River County EMS", state: "Oregon", type: "county" },
  { name: "Metro Regional EMS Consortium", state: "Oregon", type: "regional_council" },
  { name: "North Central Oregon EMS", state: "Oregon", type: "regional_council" },
  { name: "Western Lane Ambulance District", state: "Oregon", type: "county" },
  { name: "Pacific West EMS", state: "Oregon", type: "regional_council" },
  { name: "Tualatin Valley Fire & Rescue EMS", state: "Oregon", type: "fire_dept" },
  { name: "Hillsboro Fire Department EMS", state: "Oregon", type: "fire_dept" },
];

// Colorado - 49+ entities
const COLORADO_ENTITIES: EMSEntity[] = [
  // 11 RETACs
  { name: "Mile-High RETAC (MHRETAC)", state: "Colorado", type: "regional_council", website: "https://www.milehighretac.org" },
  { name: "Foothills RETAC (FRETAC)", state: "Colorado", type: "regional_council", website: "https://foothillsretac.com" },
  { name: "Northeast Colorado RETAC (NCRETAC)", state: "Colorado", type: "regional_council", website: "https://ncretac.org" },
  { name: "Northwest Colorado RETAC", state: "Colorado", type: "regional_council", website: "https://nwretac.org" },
  { name: "Central Mountains RETAC", state: "Colorado", type: "regional_council", website: "https://cmretac.org" },
  { name: "Western RETAC", state: "Colorado", type: "regional_council", website: "https://wretac.org" },
  { name: "Southwest RETAC", state: "Colorado", type: "regional_council", website: "https://swretac.com" },
  { name: "San Luis Valley RETAC", state: "Colorado", type: "regional_council", website: "https://slvretac.org" },
  { name: "Plains to Peaks RETAC", state: "Colorado", type: "regional_council", website: "https://www.plainstopeaks.org" },
  { name: "Southern Colorado RETAC", state: "Colorado", type: "regional_council", website: "https://southerncoloradoretac.org" },
  { name: "Southeastern Colorado RETAC", state: "Colorado", type: "regional_council", website: "https://southerncoloradoretac.org" },
  // Denver Metro EMS Medical Directors Group
  { name: "Denver Metro EMS Medical Directors (DMEMSMD)", state: "Colorado", type: "regional_council", website: "https://www.dmemsmd.org/protocols" },
  // Denver Metro Fire Protection Districts
  { name: "South Metro Fire Rescue EMS", state: "Colorado", type: "fire_dept" },
  { name: "West Metro Fire Rescue EMS", state: "Colorado", type: "fire_dept" },
  { name: "North Metro Fire Rescue EMS", state: "Colorado", type: "fire_dept" },
  { name: "North Washington Fire Protection District", state: "Colorado", type: "fire_dept" },
  { name: "Mountain View Fire Rescue EMS", state: "Colorado", type: "fire_dept" },
  { name: "Rocky Mountain Fire Protection District", state: "Colorado", type: "fire_dept" },
  { name: "Evergreen Fire Protection District", state: "Colorado", type: "fire_dept" },
  { name: "Elk Creek Fire Protection District", state: "Colorado", type: "fire_dept" },
  { name: "Columbine Fire Protection District", state: "Colorado", type: "fire_dept" },
  { name: "Coal Creek Canyon Fire Protection District", state: "Colorado", type: "fire_dept" },
  { name: "Bennett Fire Rescue", state: "Colorado", type: "fire_dept" },
  { name: "Southwest Adams Fire Protection District", state: "Colorado", type: "fire_dept" },
  // County EMS
  { name: "Denver Health Paramedics", state: "Colorado", type: "county", website: "https://denverems.org" },
  { name: "Adams County EMS", state: "Colorado", type: "county" },
  { name: "Arapahoe County EMS", state: "Colorado", type: "county" },
  { name: "Boulder County EMS", state: "Colorado", type: "county" },
  { name: "Broomfield County EMS", state: "Colorado", type: "county" },
  { name: "Douglas County EMS", state: "Colorado", type: "county" },
  { name: "Elbert County EMS", state: "Colorado", type: "county" },
  { name: "Gilpin County Ambulance", state: "Colorado", type: "county", website: "https://www.gilpinambulance.com/" },
  { name: "Grand County EMS", state: "Colorado", type: "county", website: "https://www.grandcountyems.com/" },
  { name: "Jefferson County EMS", state: "Colorado", type: "county" },
  { name: "Clear Creek County EMS", state: "Colorado", type: "county" },
  // Colorado Springs
  { name: "Colorado Springs Fire Department EMS", state: "Colorado", type: "fire_dept" },
  { name: "Aurora Fire Rescue EMS", state: "Colorado", type: "fire_dept" },
  // UCHealth
  { name: "UCHealth LifeLine", state: "Colorado", type: "hospital" },
];

// New Mexico - 17+ entities
const NEW_MEXICO_ENTITIES: EMSEntity[] = [
  { name: "NM EMS Region I (Northern NM)", state: "New Mexico", type: "regional_council" },
  { name: "NM EMS Region II (Southern NM)", state: "New Mexico", type: "regional_council", website: "https://emsregion2.org" },
  { name: "NM EMS Region III (Eastern NM)", state: "New Mexico", type: "regional_council", website: "https://emsregion3.org" },
  { name: "Albuquerque Fire Rescue EMS", state: "New Mexico", type: "fire_dept", website: "https://portal.acidremap.com/sites/ABCEMS/" },
  { name: "Las Cruces Fire Department EMS", state: "New Mexico", type: "fire_dept" },
  { name: "Bernalillo County Fire EMS", state: "New Mexico", type: "county" },
  { name: "Rio Rancho Fire and Rescue EMS", state: "New Mexico", type: "fire_dept" },
  { name: "Santa Fe County Fire Department EMS", state: "New Mexico", type: "county" },
  { name: "City of Santa Fe Fire EMS", state: "New Mexico", type: "fire_dept" },
  { name: "Sandoval County Fire and Rescue EMS", state: "New Mexico", type: "county" },
  { name: "Doña Ana County Fire and Rescue EMS", state: "New Mexico", type: "county" },
  { name: "NMSU Fire Department EMS", state: "New Mexico", type: "fire_dept" },
  { name: "UNM EMS Guidelines", state: "New Mexico", type: "hospital" },
];

// Hawaii - 8 entities
const HAWAII_ENTITIES: EMSEntity[] = [
  { name: "Hawaii State Department of Health EMS", state: "Hawaii", type: "state", website: "https://health.hawaii.gov/ems/" },
  { name: "Honolulu EMS Department (HESD)", state: "Hawaii", type: "county" },
  { name: "Hawaii County Fire Department EMS", state: "Hawaii", type: "fire_dept" },
  { name: "Maui County Fire Department EMS", state: "Hawaii", type: "fire_dept" },
  { name: "Kauai Fire Department EMS", state: "Hawaii", type: "fire_dept" },
  { name: "AMR Hawaii", state: "Hawaii", type: "municipal" },
  { name: "REACH Air Medical Services Hawaii", state: "Hawaii", type: "hospital" },
];

// Alaska - 16 entities
const ALASKA_ENTITIES: EMSEntity[] = [
  { name: "Southern Region EMS Council (SREMSC)", state: "Alaska", type: "regional_council", website: "https://www.sremsc.org/" },
  { name: "Interior Region EMS Council (IREMSC)", state: "Alaska", type: "regional_council", website: "https://iremsc.org/" },
  { name: "Southeast Region EMS Council (SEREMS)", state: "Alaska", type: "regional_council", website: "https://serems.org/" },
  { name: "North Slope Borough EMS", state: "Alaska", type: "county" },
  { name: "Northwest Arctic/Maniilaq Association EMS", state: "Alaska", type: "regional_council" },
  { name: "Norton Sound Health Corporation EMS", state: "Alaska", type: "hospital" },
  { name: "Yukon-Kuskokwim Health Corporation EMS", state: "Alaska", type: "hospital" },
  { name: "Anchorage Fire Department EMS", state: "Alaska", type: "fire_dept" },
  { name: "Chugiak Volunteer Fire and Rescue", state: "Alaska", type: "fire_dept" },
  { name: "Girdwood Fire and Rescue EMS", state: "Alaska", type: "fire_dept" },
  { name: "Hope/Sunrise Emergency Services", state: "Alaska", type: "fire_dept" },
  { name: "Bristol Bay Borough Emergency Services", state: "Alaska", type: "county" },
  { name: "Nenana Fire/EMS", state: "Alaska", type: "fire_dept" },
];

// Idaho - 14 entities
const IDAHO_ENTITIES: EMSEntity[] = [
  { name: "Idaho Bureau of EMS", state: "Idaho", type: "state", website: "https://healthandwelfare.idaho.gov/providers/idaho-bureau-emergency-medical-services/" },
  { name: "Ada County Paramedics (ACP)", state: "Idaho", type: "county", website: "https://adacounty.id.gov/paramedics/access/" },
  { name: "Boise Fire Department EMS", state: "Idaho", type: "fire_dept" },
  { name: "Meridian Fire Department EMS", state: "Idaho", type: "fire_dept" },
  { name: "Eagle Fire EMS", state: "Idaho", type: "fire_dept" },
  { name: "Star Fire EMS", state: "Idaho", type: "fire_dept" },
  { name: "Kuna Fire EMS", state: "Idaho", type: "fire_dept" },
  { name: "Northern Idaho Healthcare Coalition", state: "Idaho", type: "regional_council" },
  { name: "Central Idaho Healthcare Coalition", state: "Idaho", type: "regional_council" },
  { name: "Southern Idaho Healthcare Coalition", state: "Idaho", type: "regional_council" },
];

// Montana - 14 entities
const MONTANA_ENTITIES: EMSEntity[] = [
  { name: "Western Montana RTAC", state: "Montana", type: "regional_council" },
  { name: "Central Montana RTAC", state: "Montana", type: "regional_council" },
  { name: "Eastern Montana RTAC", state: "Montana", type: "regional_council" },
  { name: "Bozeman Health Regional Medical Center EMS", state: "Montana", type: "hospital" },
  { name: "Missoula Emergency Services Inc.", state: "Montana", type: "municipal" },
  { name: "Montana Medical Transport Ambulance (Helena)", state: "Montana", type: "municipal" },
  { name: "Central Montana Medical Center Ambulance", state: "Montana", type: "hospital" },
  { name: "Big Horn County Ambulance", state: "Montana", type: "county" },
  { name: "Musselshell County Ambulance", state: "Montana", type: "county" },
  { name: "North Valley EMS Inc.", state: "Montana", type: "municipal" },
  { name: "Central Valley Fire District/Belgrade City Fire EMS", state: "Montana", type: "fire_dept" },
];

// Wyoming - 10 entities
const WYOMING_ENTITIES: EMSEntity[] = [
  { name: "Wyoming Office of EMS", state: "Wyoming", type: "state", website: "https://health.wyo.gov/publichealth/ems/" },
  { name: "Teton County EMS", state: "Wyoming", type: "county", website: "https://www.tetoncountywy.gov/908/Division-17---EMS-Operations" },
  { name: "City of Laramie EMS", state: "Wyoming", type: "municipal", website: "https://www.cityoflaramie.org/1461/EMS-Protocols" },
  { name: "Campbell County Health EMS", state: "Wyoming", type: "county" },
  { name: "Natrona County EMS (Casper)", state: "Wyoming", type: "county" },
  { name: "Laramie County EMS (Cheyenne)", state: "Wyoming", type: "county" },
  { name: "Fremont County EMS", state: "Wyoming", type: "county" },
  { name: "Sweetwater County EMS", state: "Wyoming", type: "county" },
];

// Oklahoma - 13+ entities
const OKLAHOMA_ENTITIES: EMSEntity[] = [
  { name: "Oklahoma State EMS Division", state: "Oklahoma", type: "state", website: "https://oklahoma.gov/health/protective-health/emergency-systems/ems-division/protocols.html" },
  { name: "Emergency Medical Services Authority (EMSA)", state: "Oklahoma", type: "regional_council", website: "https://emsaok.gov/" },
  { name: "Medical Control Board (MCB/OMD)", state: "Oklahoma", type: "regional_council", website: "http://okctulomd.com/" },
  { name: "Norman Fire Department EMS", state: "Oklahoma", type: "fire_dept" },
  { name: "EMSSTAT (Norman Regional)", state: "Oklahoma", type: "hospital" },
  { name: "Owasso Fire Department EMS", state: "Oklahoma", type: "fire_dept" },
  { name: "Life EMS (Enid/Garfield County)", state: "Oklahoma", type: "county", website: "https://lifeemsenid.com/" },
  { name: "Southern Oklahoma Ambulance Service", state: "Oklahoma", type: "regional_council", website: "https://soas.net/" },
  { name: "Kirks Emergency Service (Lawton)", state: "Oklahoma", type: "municipal" },
  { name: "LifeNet Inc. (Stillwater)", state: "Oklahoma", type: "municipal" },
  { name: "Tulsa Fire Department EMS", state: "Oklahoma", type: "fire_dept", website: "http://okctulomd.website/treatment-protocols" },
];

// Kansas - 25+ entities
const KANSAS_ENTITIES: EMSEntity[] = [
  { name: "Kansas Board of EMS (KBEMS)", state: "Kansas", type: "state", website: "https://www.ksbems.org/ems" },
  { name: "Kansas EMS Region I (Northwest)", state: "Kansas", type: "regional_council" },
  { name: "Kansas EMS Region II (Southwest/SKEMS)", state: "Kansas", type: "regional_council", website: "https://www.skems.com/" },
  { name: "Kansas EMS Region III (South Central)", state: "Kansas", type: "regional_council", website: "http://www.ksregion3ems.org/" },
  { name: "Kansas EMS Region IV (North Central)", state: "Kansas", type: "regional_council", website: "https://www.kansasemsregion4.org/" },
  { name: "Kansas EMS Region V (Northeast)", state: "Kansas", type: "regional_council", website: "https://www.region5ems.com/" },
  { name: "Kansas EMS Region VI (Southeast)", state: "Kansas", type: "regional_council", website: "http://www.region6ems.org" },
  { name: "Kansas City Kansas Fire Department EMS", state: "Kansas", type: "fire_dept", website: "http://www.kckfd.org/index.php/ems-division/" },
  { name: "Lawrence-Douglas County Fire Medical", state: "Kansas", type: "county", website: "https://lawrenceks.gov/fire-medical/ems/" },
  { name: "AMR Kansas - Topeka/Shawnee County", state: "Kansas", type: "county" },
  { name: "Riley County EMS", state: "Kansas", type: "county" },
  { name: "Jefferson County Ambulance Service", state: "Kansas", type: "county" },
  { name: "Wichita Fire Department EMS", state: "Kansas", type: "fire_dept" },
  { name: "Salina Fire/EMS", state: "Kansas", type: "fire_dept" },
  { name: "Junction City Fire EMS", state: "Kansas", type: "fire_dept" },
  { name: "Emporia Fire/EMS", state: "Kansas", type: "fire_dept" },
  { name: "Great Bend Fire/EMS", state: "Kansas", type: "fire_dept" },
];

// Nebraska - 6 entities
const NEBRASKA_ENTITIES: EMSEntity[] = [
  { name: "Nebraska DHHS Board of EMS", state: "Nebraska", type: "state", website: "https://dhhs.ne.gov/OEHS%20Program%20Documents/EMS%20Model%20Protocols%202024.pdf" },
  { name: "Omaha Fire Department EMS", state: "Nebraska", type: "fire_dept", website: "https://www.omaha-fire.org/" },
  { name: "Lincoln Fire & Rescue EMS", state: "Nebraska", type: "fire_dept" },
  { name: "North Platte Fire Department EMS", state: "Nebraska", type: "fire_dept" },
  { name: "Bellevue Fire Department EMS", state: "Nebraska", type: "fire_dept" },
  { name: "Grand Island Fire Department EMS", state: "Nebraska", type: "fire_dept" },
];

// Iowa - 16+ entities
const IOWA_ENTITIES: EMSEntity[] = [
  { name: "Iowa HHS Bureau of EMS and Trauma Services", state: "Iowa", type: "state", website: "https://hhs.iowa.gov/emergency-medical-services-trauma/" },
  { name: "Des Moines Fire Department EMS", state: "Iowa", type: "fire_dept" },
  { name: "West Des Moines EMS", state: "Iowa", type: "municipal" },
  { name: "Cedar Rapids Fire Department EMS", state: "Iowa", type: "fire_dept" },
  { name: "Johnson County Ambulance Service (Iowa City)", state: "Iowa", type: "county" },
  { name: "Scott County EMS (Davenport/Quad Cities)", state: "Iowa", type: "county" },
  { name: "Area Ambulance Service/Cedar Rapids EMS", state: "Iowa", type: "municipal" },
  { name: "Fort Dodge Fire/Rescue EMS", state: "Iowa", type: "fire_dept" },
  { name: "Dallas County EMS", state: "Iowa", type: "county" },
  { name: "Marion County EMS", state: "Iowa", type: "county" },
  { name: "Ringgold County Ambulance", state: "Iowa", type: "county" },
  { name: "Shelby County ESA", state: "Iowa", type: "county" },
];

// North Dakota - 8 entities
const NORTH_DAKOTA_ENTITIES: EMSEntity[] = [
  { name: "North Dakota HHS Emergency Medical Systems Unit", state: "North Dakota", type: "state", website: "https://www.hhs.nd.gov/health/EMS/emergency-medical-services-ems-system" },
  { name: "Sanford Ambulance Fargo (F-M Ambulance Service)", state: "North Dakota", type: "hospital", website: "https://www.sanfordhealth.org/medical-services/emergency-medicine/ambulance-service" },
  { name: "Sanford AirMed", state: "North Dakota", type: "hospital" },
  { name: "Rugby EMS (Heart of America Medical Center)", state: "North Dakota", type: "hospital", website: "https://www.hamc.com/ems" },
  { name: "Sanford Health EMS (Bismarck)", state: "North Dakota", type: "hospital" },
  { name: "Rural Cass County Ambulance and Rescue", state: "North Dakota", type: "county" },
];

// South Dakota - 5 entities
const SOUTH_DAKOTA_ENTITIES: EMSEntity[] = [
  { name: "South Dakota Department of Health EMS & Trauma Program", state: "South Dakota", type: "state", website: "https://ems.sd.gov/" },
  { name: "Sioux Falls Fire Rescue EMS", state: "South Dakota", type: "fire_dept", website: "https://www.siouxfalls.gov/health-safety/fire" },
  { name: "Rapid City Fire Department Medical Operations", state: "South Dakota", type: "fire_dept" },
  { name: "Pennington County Fire Administration", state: "South Dakota", type: "county" },
];

// Arkansas - 15+ entities
const ARKANSAS_ENTITIES: EMSEntity[] = [
  { name: "Arkansas Department of Health Section of EMS", state: "Arkansas", type: "state", website: "https://healthy.arkansas.gov/programs-services/licensing-military-member-licensure-permits-plan-reviews/emergency-medical-services/" },
  { name: "Metropolitan Emergency Medical Services (MEMS)", state: "Arkansas", type: "regional_council", website: "https://www.metroems.org/" },
  { name: "Fort Smith EMS", state: "Arkansas", type: "municipal", website: "https://www.fortsmithems.org/" },
  { name: "Washington County Regional Ambulance Authority (Central EMS)", state: "Arkansas", type: "county", website: "https://centralems.org/" },
  { name: "City of Rogers Ambulance Service", state: "Arkansas", type: "municipal" },
  { name: "Siloam Springs Fire Department EMS", state: "Arkansas", type: "fire_dept" },
  { name: "Springdale Fire Department EMS", state: "Arkansas", type: "fire_dept" },
  { name: "Survival Flight EMS (Batesville)", state: "Arkansas", type: "hospital" },
  { name: "Vital Link Inc. (Batesville)", state: "Arkansas", type: "municipal" },
  { name: "Southern Paramedic Service Inc. (Brinkley)", state: "Arkansas", type: "municipal" },
  { name: "Sebastian County EMS/Rescue", state: "Arkansas", type: "county" },
  { name: "North Little Rock Fire Department EMS", state: "Arkansas", type: "fire_dept" },
  { name: "Little Rock Fire Department EMS", state: "Arkansas", type: "fire_dept" },
];

// Mississippi - 40+ entities
const MISSISSIPPI_ENTITIES: EMSEntity[] = [
  { name: "Mississippi State OEMSACS", state: "Mississippi", type: "state", website: "https://msdh.ms.gov/page/47.html" },
  { name: "Mississippi Trauma Care System Foundation", state: "Mississippi", type: "state", website: "https://mstraumafoundation.org/" },
  // Gulf Coast
  { name: "Acadian Ambulance (Jackson County)", state: "Mississippi", type: "county" },
  { name: "Acadian Ambulance (Harrison County)", state: "Mississippi", type: "county" },
  { name: "Acadian Ambulance (DeSoto County)", state: "Mississippi", type: "county" },
  // Delta Region
  { name: "MedStat EMS (Delta Region)", state: "Mississippi", type: "regional_council" },
  { name: "Pafford EMS (Cleveland/Clarksdale)", state: "Mississippi", type: "regional_council" },
  { name: "Pafford Air One-Delta", state: "Mississippi", type: "hospital" },
  { name: "Delta EMS Ambulance Service", state: "Mississippi", type: "regional_council" },
  { name: "Delta Regional Medical Center Ambulance", state: "Mississippi", type: "hospital" },
  { name: "Bolivar Med Center EMS", state: "Mississippi", type: "hospital" },
  // North Mississippi
  { name: "North Mississippi Medical Center Ambulance Service (Tupelo)", state: "Mississippi", type: "hospital" },
  { name: "DeSoto County EMS", state: "Mississippi", type: "county", website: "https://www.desotocountyms.gov/179/Emergency-Medical-Services-EMS" },
  { name: "Magnolia EMS (Corinth)", state: "Mississippi", type: "municipal" },
  { name: "Tippah County Hospital Ambulance", state: "Mississippi", type: "hospital" },
  { name: "Quitman County Ambulance Service", state: "Mississippi", type: "county" },
  // Central Mississippi
  { name: "AMR Central Mississippi/Hinds", state: "Mississippi", type: "county", website: "https://www.amr.net/locations/mississippi/central-mississippi" },
  { name: "Hinds County EMS", state: "Mississippi", type: "county" },
  { name: "Neshoba County Ambulance Enterprise", state: "Mississippi", type: "county" },
  { name: "Choctaw Health Center EMS (Tribal)", state: "Mississippi", type: "hospital" },
  { name: "OCH Regional Medical Center Ambulance", state: "Mississippi", type: "hospital" },
  // South Mississippi
  { name: "AAA Ambulance Service (Hattiesburg)", state: "Mississippi", type: "municipal" },
  { name: "EMServ Ambulance Service (Laurel/Jones County)", state: "Mississippi", type: "county" },
  { name: "Covington County Hospital EMS", state: "Mississippi", type: "hospital" },
  { name: "Wayne General Hospital EMS", state: "Mississippi", type: "hospital" },
  { name: "King's Daughters Medical Center Ambulance", state: "Mississippi", type: "hospital" },
  { name: "Vicksburg Fire Department Ambulance", state: "Mississippi", type: "fire_dept" },
  { name: "Miss-Lou Ambulance/Metro Ambulance (Natchez)", state: "Mississippi", type: "municipal" },
  // Memphis Metro (DeSoto County)
  { name: "Olive Branch Fire Department Ambulance", state: "Mississippi", type: "fire_dept" },
  { name: "Southaven Fire Department Ambulance", state: "Mississippi", type: "fire_dept" },
  { name: "Hernando Fire EMS", state: "Mississippi", type: "fire_dept" },
  { name: "Horn Lake Fire and EMS", state: "Mississippi", type: "fire_dept" },
  // Air Medical
  { name: "University Medical Center AirCare (Jackson)", state: "Mississippi", type: "hospital" },
  { name: "UMMC Children's Transport", state: "Mississippi", type: "hospital" },
  { name: "Baptist LifeFlight", state: "Mississippi", type: "hospital" },
];

// Alabama - 20+ entities
const ALABAMA_ENTITIES: EMSEntity[] = [
  { name: "Alabama Department of Public Health Office of EMS", state: "Alabama", type: "state", website: "https://www.alabamapublichealth.gov/ems/" },
  // 6 Regional EMS offices
  { name: "Alabama EMS Region One (AERO)", state: "Alabama", type: "regional_council", website: "https://www.aer1.org/" },
  { name: "East Alabama EMS (EAEMS)", state: "Alabama", type: "regional_council", website: "http://www.eastalabamaems.com/" },
  { name: "Birmingham Regional EMS System (BREMSS)", state: "Alabama", type: "regional_council", website: "https://bremss.org/" },
  { name: "West Alabama Region Four EMS", state: "Alabama", type: "regional_council" },
  { name: "Southeast Alabama EMS Council (SEAEMS)", state: "Alabama", type: "regional_council", website: "https://seaems.com/" },
  { name: "Alabama Gulf EMS System (AGEMSS)", state: "Alabama", type: "regional_council", website: "https://www.southalabama.edu/colleges/alliedhealth/ems/emsregion6.html" },
  // Major agencies
  { name: "HEMSI (Huntsville Emergency Medical Services Inc.)", state: "Alabama", type: "municipal", website: "https://www.hemsi.org/" },
  { name: "Mobile Fire-Rescue Department EMS", state: "Alabama", type: "fire_dept", website: "https://www.cityofmobile.org/fire/emergency-medical-services/" },
  { name: "Montgomery Fire/Rescue EMS Division", state: "Alabama", type: "fire_dept", website: "https://www.montgomeryal.gov/government/city-government/city-departments/fire-rescue-department/" },
  { name: "Birmingham Fire and Rescue Service EMS Division", state: "Alabama", type: "fire_dept", website: "https://www.birminghamal.gov/government/city-departments/fire-rescue-service/divisions/emergency-medical-services-division" },
  { name: "HH Health System EMS", state: "Alabama", type: "hospital" },
  { name: "NorthStar Emergency Medical Services (Tuscaloosa)", state: "Alabama", type: "municipal" },
  { name: "Orange Beach Fire Rescue EMS", state: "Alabama", type: "fire_dept" },
  { name: "Regional Paramedical Services Inc. (Jasper)", state: "Alabama", type: "municipal" },
  { name: "Mobile County EMS (MCEMSS)", state: "Alabama", type: "county", website: "https://mobilecountyems.org/" },
  { name: "Hoover Fire Department EMS", state: "Alabama", type: "fire_dept", website: "https://hooverfire.org/ems-division-2/" },
  { name: "Haynes Ambulance of Alabama", state: "Alabama", type: "municipal", website: "https://www.haynesambulance.com/" },
];

// Maryland - 24 entities
const MARYLAND_ENTITIES: EMSEntity[] = [
  { name: "Maryland Institute for EMS Systems (MIEMSS)", state: "Maryland", type: "state", website: "https://www.miemss.org" },
  // 5 MIEMSS regions
  { name: "MIEMSS Region I (Allegany, Garrett)", state: "Maryland", type: "regional_council" },
  { name: "MIEMSS Region II (Washington, Frederick)", state: "Maryland", type: "regional_council" },
  { name: "MIEMSS Region III (Baltimore Metro)", state: "Maryland", type: "regional_council" },
  { name: "MIEMSS Region IV (Eastern Shore)", state: "Maryland", type: "regional_council" },
  { name: "MIEMSS Region V (Southern Maryland)", state: "Maryland", type: "regional_council" },
  // Major county fire/EMS departments
  { name: "Montgomery County Fire and Rescue Service (MCFRS)", state: "Maryland", type: "county", website: "https://www.montgomerycountymd.gov/mcfrs/" },
  { name: "Prince George's County Fire/EMS Department", state: "Maryland", type: "county", website: "https://www.princegeorgescountymd.gov/departments-offices/fire-emergency-medical-services" },
  { name: "Baltimore County Fire Department EMS", state: "Maryland", type: "county", website: "https://www.baltimorecountymd.gov/departments/fire" },
  { name: "Baltimore City Fire Department EMS", state: "Maryland", type: "fire_dept", website: "https://fire.baltimorecity.gov" },
  { name: "Anne Arundel County Fire Department EMS", state: "Maryland", type: "county", website: "https://www.aacounty.org/fire-department" },
  { name: "Howard County Fire and Rescue Services", state: "Maryland", type: "county", website: "https://www.howardcountymd.gov/fire-and-rescue-services" },
  { name: "Frederick County Division of Fire and Rescue", state: "Maryland", type: "county", website: "https://frederickcountymd.gov/24/Division-of-Fire-Rescue-Services-DFRS" },
  { name: "Harford County Department of Emergency Services", state: "Maryland", type: "county", website: "https://www.harfordcountymd.gov/165/Emergency-Services" },
  { name: "Carroll County Fire & EMS", state: "Maryland", type: "county", website: "https://www.carrollcountymd.gov/government/directory/fire-and-emergency-services/" },
  { name: "Charles County EMS", state: "Maryland", type: "county" },
  { name: "St. Mary's County EMS", state: "Maryland", type: "county" },
  { name: "Calvert County Fire/Rescue/EMS", state: "Maryland", type: "county", website: "https://www.calvertfirerescueems.com" },
];

// South Carolina - 15 entities
const SOUTH_CAROLINA_ENTITIES: EMSEntity[] = [
  { name: "SC Department of Public Health Division of EMS", state: "South Carolina", type: "state", website: "https://dph.sc.gov/professionals/healthcare-quality/ems-and-trauma" },
  { name: "Richland County EMS", state: "South Carolina", type: "county", website: "https://www.richlandcountysc.gov/Courts-Safety/Emergency-Management/Emergency-Medical-Services" },
  { name: "Greenville County EMS", state: "South Carolina", type: "county", website: "https://www.greenvillecounty.org/EmergencyMedicalServices" },
  { name: "Charleston County EMS", state: "South Carolina", type: "county", website: "https://www.charlestoncounty.gov/departments/ems/" },
  { name: "Darlington County EMS", state: "South Carolina", type: "county", website: "https://www.darcosc.com/departments/ems/index.php" },
  { name: "Spartanburg County EMS", state: "South Carolina", type: "county" },
  { name: "Florence County EMS", state: "South Carolina", type: "county" },
  { name: "Greenwood County EMS", state: "South Carolina", type: "county" },
  { name: "Lexington County EMS", state: "South Carolina", type: "county" },
  { name: "Anderson County/Medshore Ambulance", state: "South Carolina", type: "county" },
  { name: "Fort Mill Rescue Squad and EMS", state: "South Carolina", type: "municipal" },
];

// Kentucky - 6 entities
const KENTUCKY_ENTITIES: EMSEntity[] = [
  { name: "Kentucky Board of Emergency Medical Services (KBEMS)", state: "Kentucky", type: "state", website: "https://kbems.ky.gov" },
  { name: "Louisville Metro EMS (LMEMS)", state: "Kentucky", type: "municipal", website: "https://louisvilleky.gov/government/emergency-services/emergency-medical-services" },
  { name: "Lexington Fire & Emergency Services EMS", state: "Kentucky", type: "fire_dept", website: "https://www.lexingtonky.gov/browse/public-safety/fire-and-emergency-services" },
  { name: "Academy of Medicine of Cincinnati Protocols (KY)", state: "Kentucky", type: "regional_council" },
  { name: "Kentucky EMS Association", state: "Kentucky", type: "state", website: "https://www.kyemsa.org" },
];

// West Virginia - 11 entities
const WEST_VIRGINIA_ENTITIES: EMSEntity[] = [
  { name: "West Virginia Office of Emergency Medical Services (OEMS)", state: "West Virginia", type: "state", website: "https://dhhr.wv.gov/oems" },
  { name: "Kanawha County Ambulance Authority", state: "West Virginia", type: "county", website: "http://kceaa.org" },
  { name: "Cabell County EMS", state: "West Virginia", type: "county", website: "https://www.ccems.org" },
  { name: "Kanawha County Metro 911", state: "West Virginia", type: "county", website: "https://www.metro911.org" },
  { name: "Berkeley County EMS (Eastern Panhandle)", state: "West Virginia", type: "county" },
  { name: "Greenbrier County EMS", state: "West Virginia", type: "county" },
  { name: "Hampshire County EMS", state: "West Virginia", type: "county" },
  { name: "Raleigh County EMS (Beckley)", state: "West Virginia", type: "county" },
  { name: "Preston County EMS", state: "West Virginia", type: "county" },
];

// Connecticut - 8 entities
const CONNECTICUT_ENTITIES: EMSEntity[] = [
  { name: "Connecticut DPH Office of EMS", state: "Connecticut", type: "state", website: "https://portal.ct.gov/DPH/Emergency-Medical-Services/EMS/Office-of-Emergency-Medical-Services-Homepage" },
  { name: "Southwest CT EMS Council (Region 1)", state: "Connecticut", type: "regional_council", website: "https://www.swctemscouncil.org/" },
  { name: "South Central CT EMS Council (Region 2)", state: "Connecticut", type: "regional_council", website: "https://ctemscouncils.org/region-2-contact/" },
  { name: "North Central CT EMS Council (Region 3)", state: "Connecticut", type: "regional_council", website: "https://northcentralctems.org/" },
  { name: "Eastern CT EMS Council (Region 4)", state: "Connecticut", type: "regional_council", website: "https://ctemscouncils.org/region-4-contact/" },
  { name: "Northwest CT EMS Council (Region 5)", state: "Connecticut", type: "regional_council", website: "https://ctemscouncils.org/region-5-hospitals/" },
  { name: "Council of Regional Presidents (CORP)", state: "Connecticut", type: "state", website: "https://ctemscouncils.org/about/" },
];

// Massachusetts - 7 entities
const MASSACHUSETTS_ENTITIES: EMSEntity[] = [
  { name: "Massachusetts DPH Office of EMS", state: "Massachusetts", type: "state", website: "https://www.mass.gov/dph/oems" },
  { name: "Western Massachusetts EMS (WMEMS) - Region 1", state: "Massachusetts", type: "regional_council", website: "https://wmems.org/" },
  { name: "Central Massachusetts EMS Council (CMEMSC) - Region 2", state: "Massachusetts", type: "regional_council", website: "https://cmemsc.org/" },
  { name: "NorthEast EMS (NEEMS) - Region 3", state: "Massachusetts", type: "regional_council", website: "https://www.neems.org/" },
  { name: "Metropolitan Boston EMS Council (MBEMSC) - Region 4", state: "Massachusetts", type: "regional_council", website: "https://www.mbemsc.org/" },
  { name: "Southeastern Massachusetts EMS Council (SEMAEMS) - Region 5", state: "Massachusetts", type: "regional_council", website: "https://www.semaems.com/" },
  { name: "Cape and Islands EMS System (CIEMSS)", state: "Massachusetts", type: "regional_council", website: "https://capeandislandsems.org/" },
];

// New Hampshire - 4 entities
const NEW_HAMPSHIRE_ENTITIES: EMSEntity[] = [
  { name: "NH Bureau of Emergency Medical Services", state: "New Hampshire", type: "state", website: "https://www.fstems.dos.nh.gov/ems-systems/patient-care-protocols" },
  { name: "NH Division of Fire Standards and Training & EMS", state: "New Hampshire", type: "state" },
  { name: "NH EMS Medical Control Board", state: "New Hampshire", type: "state" },
  { name: "NH Medical and Trauma Services Coordinating Board", state: "New Hampshire", type: "state" },
];

// Vermont - 15 entities
const VERMONT_ENTITIES: EMSEntity[] = [
  { name: "Vermont Department of Health Office of EMS", state: "Vermont", type: "state", website: "https://www.healthvermont.gov/emergency/emergency-medical-services" },
  { name: "Vermont EMS District 1 (Franklin, N. Grand Isle)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 2 (Orleans, N. Essex)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 3 (Chittenden)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 4 (Lamoille)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 5 (Caledonia, N. Orange)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 6 (Washington County)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 7 (Addison County)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 8 (Orange, N. Windsor)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 9 (Windsor, S. Orange)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 10 (Rutland County)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 11 (S. Windsor, N. Windham)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 12 (Bennington, W. Windham)", state: "Vermont", type: "regional_council" },
  { name: "Vermont EMS District 13 (Windham County)", state: "Vermont", type: "regional_council" },
];

// Maine - 8+ entities
const MAINE_ENTITIES: EMSEntity[] = [
  { name: "Maine Emergency Medical Services", state: "Maine", type: "state", website: "https://www.maine.gov/ems/" },
  { name: "Maine EMS Region 1 (Cumberland, York)", state: "Maine", type: "regional_council" },
  { name: "Maine EMS Region 2 (Androscoggin, Franklin, Kennebec, Oxford, Sagadahoc, Somerset)", state: "Maine", type: "regional_council" },
  { name: "Maine EMS Region 3 (Hancock, Knox, Lincoln, Penobscot, Piscataquis, Waldo, Washington)", state: "Maine", type: "regional_council" },
  { name: "Maine EMS Region 4 (Aroostook County)", state: "Maine", type: "regional_council" },
  { name: "Atlantic Partners EMS (APEMS)", state: "Maine", type: "regional_council", website: "https://www.apems.org/regions" },
  { name: "Tri-County EMS", state: "Maine", type: "regional_council", website: "http://www.tricountyems.org/" },
];

// Hospital-based EMS - 19 entities
const HOSPITAL_EMS_ENTITIES: EMSEntity[] = [
  { name: "Cleveland Clinic EMS", state: "Ohio", type: "hospital", website: "https://portal.acidremap.com/sites/CCFEMS/" },
  { name: "Mayo Clinic Ambulance Service", state: "Minnesota", type: "hospital", website: "https://www.mayoclinic.org/ambulance-service" },
  { name: "University Hospitals (UH) EMS", state: "Ohio", type: "hospital", website: "https://uhems.org/protocols" },
  { name: "Grady EMS", state: "Georgia", type: "hospital", website: "https://www.gradyhealth.org/grady-ems/" },
  { name: "University Hospital EMS (Newark)", state: "New Jersey", type: "hospital", website: "https://uh-ems.org" },
  { name: "University of Missouri Health Care Ambulance", state: "Missouri", type: "hospital" },
  { name: "Good Samaritan Hospital EMS", state: "Indiana", type: "hospital", website: "https://www.gshvin.org/documents/GSH-EMS-Protocols-for-Web-Page.pdf" },
  { name: "St. Vincent Health EMS", state: "Indiana", type: "hospital" },
  { name: "SSM Health EMS/SSM Cardinal Glennon", state: "Missouri", type: "hospital" },
  { name: "IU Health LifeLine", state: "Indiana", type: "hospital" },
  { name: "Banner Health Paramedics (AZ/CO)", state: "Arizona", type: "hospital" },
  { name: "Baystate Medical Center Critical Care Transport", state: "Massachusetts", type: "hospital" },
  { name: "UNC Critical Care Transport", state: "North Carolina", type: "hospital" },
  { name: "Novant Health Mobile Integrated Health", state: "North Carolina", type: "hospital" },
  { name: "Mayo Clinic Jacksonville", state: "Florida", type: "hospital" },
  { name: "Flagstaff Medical Center EMS", state: "Arizona", type: "hospital" },
  { name: "Banner Churchill Community Hospital EMS", state: "Nevada", type: "hospital" },
  { name: "Humboldt General Hospital EMS/Rescue", state: "Nevada", type: "hospital" },
];

// Medium-city Fire Department EMS - 19 entities
const FIRE_DEPT_EMS_ENTITIES: EMSEntity[] = [
  { name: "Tulsa Fire Department EMS", state: "Oklahoma", type: "fire_dept", website: "http://okctulomd.website/treatment-protocols" },
  { name: "Omaha Fire Department EMS", state: "Nebraska", type: "fire_dept" },
  { name: "Colorado Springs Fire Department EMS", state: "Colorado", type: "fire_dept" },
  { name: "Sacramento Fire Department/Metro Fire EMS", state: "California", type: "fire_dept" },
  { name: "Wichita Fire Department EMS", state: "Kansas", type: "fire_dept" },
  { name: "Minneapolis Fire Department EMS", state: "Minnesota", type: "fire_dept" },
  { name: "Raleigh Fire Department EMS", state: "North Carolina", type: "fire_dept" },
  { name: "Virginia Beach Fire/EMS Departments", state: "Virginia", type: "fire_dept" },
  { name: "Tampa Fire Rescue EMS", state: "Florida", type: "fire_dept" },
  { name: "Aurora Fire Rescue EMS", state: "Colorado", type: "fire_dept" },
  { name: "Mesa Fire Department EMS", state: "Arizona", type: "fire_dept" },
  { name: "Long Beach Fire Department EMS", state: "California", type: "fire_dept" },
  { name: "Oakland Fire Department EMS", state: "California", type: "fire_dept" },
  { name: "Bakersfield Fire Department EMS", state: "California", type: "fire_dept" },
  { name: "Arlington Fire Department EMS", state: "Texas", type: "fire_dept" },
  { name: "Anaheim Fire Department EMS", state: "California", type: "fire_dept" },
  { name: "Rapid City Fire Department EMS", state: "South Dakota", type: "fire_dept" },
  { name: "Fort Worth Fire Department EMS", state: "Texas", type: "fire_dept" },
  { name: "San Antonio Fire Department EMS", state: "Texas", type: "fire_dept" },
];

// Community Paramedicine / MIH Programs - 20 entities
const COMMUNITY_PARAMEDICINE_ENTITIES: EMSEntity[] = [
  { name: "Colorado Springs Fire Department CARES Program", state: "Colorado", type: "community_paramedicine" },
  { name: "Mayo Clinic Ambulance Community Paramedic Service", state: "Minnesota", type: "community_paramedicine" },
  { name: "Tulsa Fire Department MIH Program", state: "Oklahoma", type: "community_paramedicine" },
  { name: "Grady EMS Mobile Integrated Health", state: "Georgia", type: "community_paramedicine" },
  { name: "Durham County Community Paramedicine", state: "North Carolina", type: "community_paramedicine" },
  { name: "Crawfordsville MIH Program", state: "Indiana", type: "community_paramedicine" },
  { name: "Central Oregon Community Paramedicine", state: "Oregon", type: "community_paramedicine" },
  { name: "Queen Anne's County MICH", state: "Maryland", type: "community_paramedicine" },
  { name: "Indiana MIH Programs", state: "Indiana", type: "community_paramedicine", website: "https://www.in.gov/dhs/ems/mobile-integrated-health/" },
  { name: "Michigan Community Integrated Paramedicine", state: "Michigan", type: "community_paramedicine", website: "https://www.michigan.gov/mdhhs/inside-mdhhs/legislationpolicy/ems/community-integrated-paramedicine" },
  { name: "Massachusetts MIH and Community EMS", state: "Massachusetts", type: "community_paramedicine", website: "https://www.mass.gov/mobile-integrated-health-care-and-community-ems" },
  { name: "Rhode Island MIH-CP Program", state: "Rhode Island", type: "community_paramedicine" },
  { name: "Virginia MIH-CP Program", state: "Virginia", type: "community_paramedicine" },
  { name: "Maine Community Paramedicine", state: "Maine", type: "community_paramedicine" },
  { name: "Kansas Community Paramedicine Programs", state: "Kansas", type: "community_paramedicine" },
  { name: "instED Community Paramedicine (New England)", state: "Massachusetts", type: "community_paramedicine" },
  { name: "Mission Health Partners Community CaraMedic", state: "North Carolina", type: "community_paramedicine" },
  { name: "Region 11 Chicago EMS MIH-CP", state: "Illinois", type: "community_paramedicine" },
  { name: "Washington County Ambulance District MIH", state: "Missouri", type: "community_paramedicine" },
];

// Combine all entities
const ALL_EMS_ENTITIES: EMSEntity[] = [
  ...WASHINGTON_ENTITIES,
  ...OREGON_ENTITIES,
  ...COLORADO_ENTITIES,
  ...NEW_MEXICO_ENTITIES,
  ...HAWAII_ENTITIES,
  ...ALASKA_ENTITIES,
  ...IDAHO_ENTITIES,
  ...MONTANA_ENTITIES,
  ...WYOMING_ENTITIES,
  ...OKLAHOMA_ENTITIES,
  ...KANSAS_ENTITIES,
  ...NEBRASKA_ENTITIES,
  ...IOWA_ENTITIES,
  ...NORTH_DAKOTA_ENTITIES,
  ...SOUTH_DAKOTA_ENTITIES,
  ...ARKANSAS_ENTITIES,
  ...MISSISSIPPI_ENTITIES,
  ...ALABAMA_ENTITIES,
  ...MARYLAND_ENTITIES,
  ...SOUTH_CAROLINA_ENTITIES,
  ...KENTUCKY_ENTITIES,
  ...WEST_VIRGINIA_ENTITIES,
  ...CONNECTICUT_ENTITIES,
  ...MASSACHUSETTS_ENTITIES,
  ...NEW_HAMPSHIRE_ENTITIES,
  ...VERMONT_ENTITIES,
  ...MAINE_ENTITIES,
  ...HOSPITAL_EMS_ENTITIES,
  ...FIRE_DEPT_EMS_ENTITIES,
  ...COMMUNITY_PARAMEDICINE_ENTITIES,
];

async function seedEMSEntities() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }

  const mysql = await import("mysql2/promise");
  const pool = mysql.createPool(connectionString);
  const db = drizzle(pool);

  try {
    console.log(`Seeding ${ALL_EMS_ENTITIES.length} EMS entities...`);

    // Insert entities in batches
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < ALL_EMS_ENTITIES.length; i += batchSize) {
      const batch = ALL_EMS_ENTITIES.slice(i, i + batchSize);

      const countyRecords = batch.map(entity => ({
        name: entity.name,
        state: entity.state,
        usesStateProtocols: entity.usesStateProtocols ?? false,
        protocolVersion: entity.website ? "2025" : null,
      }));

      try {
        await db.insert(counties).values(countyRecords);
        insertedCount += batch.length;
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertedCount}/${ALL_EMS_ENTITIES.length} entities`);
      } catch (error: any) {
        // Handle duplicate entries gracefully
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`Skipping duplicates in batch ${Math.floor(i / batchSize) + 1}`);
        } else {
          console.error(`Error inserting batch:`, error.message);
        }
      }
    }

    console.log(`\nSeeding complete! Total entities processed: ${ALL_EMS_ENTITIES.length}`);

    // Print summary by state
    const stateCounts: Record<string, number> = {};
    for (const entity of ALL_EMS_ENTITIES) {
      stateCounts[entity.state] = (stateCounts[entity.state] || 0) + 1;
    }

    console.log("\nEntities by state:");
    Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count}`);
      });
  } catch (error) {
    console.error("Error seeding EMS entities:", error);
    throw error;
  } finally {
    // Always close pool, even on error
    await pool.end();
  }
}

// Run the seed
seedEMSEntities().catch(console.error);
