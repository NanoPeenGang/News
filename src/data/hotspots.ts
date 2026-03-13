import { Hotspot } from '@/types';

export const hotspots: Hotspot[] = [
  { id: 'h1', name: 'Ukraine-Russia Front', lat: 48.3794, lng: 35.0, intensity: 95, description: 'Active large-scale conventional warfare with daily shelling, drone strikes, and ground offensives.', countries: ['Ukraine', 'Russia'] },
  { id: 'h2', name: 'Gaza-Israel Conflict', lat: 31.3547, lng: 34.3088, intensity: 98, description: 'Intense urban warfare and humanitarian crisis. One of the most active conflict zones globally.', countries: ['Palestine', 'Israel'] },
  { id: 'h3', name: 'Sudan Civil War', lat: 15.5007, lng: 32.5599, intensity: 88, description: 'Nationwide civil war between SAF and RSF. Massive displacement and humanitarian catastrophe.', countries: ['Sudan'] },
  { id: 'h4', name: 'Myanmar Civil War', lat: 19.7633, lng: 96.0785, intensity: 82, description: 'Multi-front civil war with ethnic armed organizations fighting military junta.', countries: ['Myanmar'] },
  { id: 'h5', name: 'Sahel Insurgency Belt', lat: 14.0, lng: 0.0, intensity: 78, description: 'Jihadist insurgency spanning Burkina Faso, Mali, and Niger. Wagner/Africa Corps involvement.', countries: ['Burkina Faso', 'Mali', 'Niger'] },
  { id: 'h6', name: 'Taiwan Strait Tensions', lat: 24.0, lng: 119.0, intensity: 72, description: 'Escalating military posturing and exercises by PLA forces near Taiwan.', countries: ['Taiwan', 'China'] },
  { id: 'h7', name: 'Horn of Africa Crisis', lat: 5.0, lng: 42.0, intensity: 75, description: 'Al-Shabaab insurgency, drought, and political instability across Somalia, Ethiopia.', countries: ['Somalia', 'Ethiopia', 'Kenya'] },
  { id: 'h8', name: 'Persian Gulf Tensions', lat: 27.0, lng: 52.0, intensity: 70, description: 'Naval confrontations, proxy conflicts, and nuclear tensions centered on Iran.', countries: ['Iran', 'USA', 'Israel'] },
  { id: 'h9', name: 'Korean Peninsula', lat: 38.0, lng: 127.0, intensity: 68, description: 'DPRK missile tests, military provocations, and nuclear program concerns.', countries: ['North Korea', 'South Korea'] },
  { id: 'h10', name: 'South China Sea Disputes', lat: 12.0, lng: 114.0, intensity: 65, description: 'Territorial disputes with increasing naval confrontations between China and ASEAN claimants.', countries: ['China', 'Philippines', 'Vietnam'] },
  { id: 'h11', name: 'Kashmir Conflict Zone', lat: 34.0, lng: 75.0, intensity: 55, description: 'Ongoing territorial dispute with periodic artillery exchanges and militant activity.', countries: ['India', 'Pakistan'] },
  { id: 'h12', name: 'Lake Chad Basin Insurgency', lat: 12.0, lng: 14.0, intensity: 60, description: 'Boko Haram and ISWAP activity threatening civilian populations across the basin.', countries: ['Nigeria', 'Chad', 'Cameroon', 'Niger'] },
  { id: 'h13', name: 'Yemen Conflict', lat: 15.0, lng: 44.0, intensity: 73, description: 'Houthi-coalition conflict with Red Sea shipping attacks and humanitarian crisis.', countries: ['Yemen', 'Saudi Arabia'] },
  { id: 'h14', name: 'Mozambique Insurgency', lat: -12.0, lng: 40.0, intensity: 52, description: 'ISCAP insurgency in Cabo Delgado threatening LNG projects and displacing civilians.', countries: ['Mozambique'] },
  { id: 'h15', name: 'Eastern DRC Conflict', lat: -1.5, lng: 29.0, intensity: 77, description: 'M23 rebellion backed by Rwanda, with multiple armed groups operating in mineral-rich eastern provinces.', countries: ['DRC', 'Rwanda'] },
];
