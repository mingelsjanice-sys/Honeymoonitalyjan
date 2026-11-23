require('dotenv').config();
const express=require('express');
const path=require('path');
const app=express();
const PORT=process.env.PORT||3000;
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

const API='https://api.api.sh/booking/v1';
async function apish(endpoint, params){
  if(!process.env.APISH_KEY) throw new Error('APISH_KEY ontbreekt op de server.');
  const url=new URL(API+endpoint);
  for(const [k,v] of Object.entries(params||{})) if(v!==undefined&&v!==null&&v!=='') url.searchParams.set(k,String(v));
  const r=await fetch(url,{headers:{'x-api-key':process.env.APISH_KEY},signal:AbortSignal.timeout(60000)});
  const text=await r.text();
  let data; try{data=JSON.parse(text)}catch{data={error:text}}
  if(!r.ok) throw new Error(`API.SH ${r.status}: ${data.error||text}`);
  return data;
}

app.get('/api/health',(req,res)=>res.json({ok:true,apiKeyConfigured:!!process.env.APISH_KEY}));
app.get('/api/accommodations',async(req,res)=>{
  try{
    const p=req.query;
    if(!p.destination) return res.status(400).json({error:'destination is required'});
    const search=await apish('/search',{q:p.destination,latitude:p.latitude,longitude:p.longitude,radius:p.radius||35,adults:p.adults||2,rooms:p.rooms||1,currency:'EUR',sort:p.sort||'review_score_and_price',stars:p.stars,review_score_min:p.review_score_min,free_cancellation:p.free_cancellation,price_max:p.price_max,offset:0});
    const hotels=(search.hotels||[]).slice(0,12).map(h=>({
      id:h.id,name:h.name,address:h.address,city:h.city,rating:h.review_score||0,reviews:h.review_count||0,stars:h.stars||0,
      image:h.image,url:h.url,lat:h.latitude,lng:h.longitude,pricePerNight:h.price_per_night||h.price_amount||null,currency:h.currency||'EUR',taxes:h.taxes_and_fees||null,
      freeCancellation:!!h.free_cancellation,freeCancellationUntil:h.free_cancellation_until,badges:h.badges||[],description:h.description||'',propertyType:h.accommodation_type_id
    }));
    res.json({hotels, total:search.total_results||hotels.length, nextOffset:search.next_offset||null, creditsUsed:search.credits_used||0});
  }catch(e){res.status(502).json({error:e.message});}
});

app.get('/api/rooms',async(req,res)=>{
  try{
    const {url,checkin,checkout,adults=2,rooms=1}=req.query;
    if(!url||!checkin||!checkout) return res.status(400).json({error:'url, checkin and checkout are required'});
    const data=await apish('/hotel-rooms',{url,checkin,checkout,adults,rooms,currency:'EUR'});
    res.json(data);
  }catch(e){res.status(502).json({error:e.message});}
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`Honeymoon Atlas running on ${PORT}`));
