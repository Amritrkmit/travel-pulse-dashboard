(function(global){
  const LABEL_OVERRIDES={
    common:{
      "other (please specify)":"Others",
      "others (please specify)":"Others",
      "single, never married":"Single",
      "spouse/significant other":"Spouse/Partner",
      "extended family (grandparents, in-laws, aunts and uncles etc.)":"Extended family",
    },
    experiences:{},
    infoChannels:{},
    timing:{}
  };

  const CONTEXT_FORMATTERS={
    experiences:label=>label.replace(/\s*(?:â€”|—|–|-)?\s*e\.g\..*$/i,"").trim(),
    infoChannels:label=>label.replace(/\s*\(e\.g\.,[^)]*\)/i,"").trim(),
    timing:label=>label
      .replace(/â€“|–/g,"-")
      .replace(/\s+before the trip$/i,"")
      .replace(/\s+from now$/i,"")
      .replace(/^Less than 1 month$/i,"<1 month")
      .replace(/^1 year or more$/i,"1+ year")
      .replace(/^Canâ€™t say$/i,"Can't say")
      .replace(/(\d)-(\d)/g,"$1–$2")
  };

  const normalizeCountryKey=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
  const countryCodes=new Map();
  if(typeof Intl.DisplayNames==="function"){
    const regionNames=new Intl.DisplayNames(["en"],{type:"region"});
    for(let first=65;first<=90;first++){
      for(let second=65;second<=90;second++){
        const code=String.fromCharCode(first,second), name=regionNames.of(code);
        const key=normalizeCountryKey(name);
        if(name&&name.toUpperCase()!==code&&!countryCodes.has(key))countryCodes.set(key,code.toLowerCase());
      }
    }
  }
  const countryAliases={
    usa:"us","unitedstatesofamerica":"us",uk:"gb",uae:"ae","russianfederation":"ru",
    "southkorea":"kr","korearepublicofsouthkorea":"kr","hongkong":"hk",macau:"mo",
    germany:"de",vietnam:"vn",curacao:"cw","bosniaandherzegovina":"ba",
    "eastgermany":null,"northvietnam":null,"netherlandsantilles":null,
    turkey:"tr",turkiye:"tr","caboverde":"cv","capeverde":"cv",reunion:"re",
    "ivorycoast":"ci","czechrepublic":"cz"
  };

  function countryCode(value){
    const key=normalizeCountryKey(format(value));
    return Object.prototype.hasOwnProperty.call(countryAliases,key)?countryAliases[key]:countryCodes.get(key)||null;
  }

  function format(value,context="common"){
    const label=String(value??"").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g," ").trim();
    const key=label.toLowerCase();
    const scoped=LABEL_OVERRIDES[context]||{};
    if(Object.prototype.hasOwnProperty.call(scoped,key))return scoped[key];
    if(Object.prototype.hasOwnProperty.call(LABEL_OVERRIDES.common,key))return LABEL_OVERRIDES.common[key];
    return (CONTEXT_FORMATTERS[context]|| (text=>text))(label);
  }

  global.TravelPulseDisplayLabels={overrides:LABEL_OVERRIDES,format,countryCode};
})(window);