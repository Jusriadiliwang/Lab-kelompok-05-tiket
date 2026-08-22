const BASE = "http://localhost:3000";

const DEMO_EVENTS = [
  { id:1, name:"Dewa 19 Reunion Tour 2026", venue:"Gelora Bung Karno, Jakarta", event_date:"2026-10-15T19:00:00", status:"on_sale", description:"Reuni legendaris Dewa 19 setelah 10 tahun.", banner_url:"https://picsum.photos/seed/dewa19/800/400", categories:[{id:1,name:"VVIP",price:2500000,available_seats:45},{id:2,name:"VIP",price:1500000,available_seats:140},{id:3,name:"Festival",price:750000,available_seats:780}]},
  { id:2, name:"Coldplay Music of the Spheres", venue:"Stadion Utama GBK, Jakarta", event_date:"2026-11-03T20:00:00", status:"on_sale", description:"Coldplay hadir ke Indonesia dengan show spektakuler.", banner_url:"https://picsum.photos/seed/coldplay/800/400", categories:[{id:4,name:"Cat 1",price:4000000,available_seats:0},{id:5,name:"Cat 2",price:2500000,available_seats:25},{id:6,name:"Cat 3",price:1200000,available_seats:380}]},
  { id:3, name:"EDC Jakarta 2026", venue:"Indonesia Arena, Jakarta", event_date:"2026-09-20T22:00:00", status:"on_sale", description:"Festival EDM terbesar di Asia Tenggara.", banner_url:"https://picsum.photos/seed/edcjakarta/800/400", categories:[{id:7,name:"VIP Loft",price:3000000,available_seats:70},{id:8,name:"General",price:900000,available_seats:2400}]},
  { id:4, name:"Raisa Live in Concert", venue:"The Kasablanka Hall, Jakarta", event_date:"2026-09-28T19:30:00", status:"on_sale", description:"Raisa hadir dengan set akustik intim.", banner_url:"https://picsum.photos/seed/raisa/800/400", categories:[{id:9,name:"Premium",price:1500000,available_seats:110},{id:10,name:"Regular",price:650000,available_seats:580}]},
  { id:5, name:"BTS Yet to Come Jakarta", venue:"Indonesia International Expo", event_date:"2026-12-10T18:00:00", status:"on_sale", description:"ARMY siap? BTS hadir kembali ke Jakarta!", banner_url:"https://picsum.photos/seed/btsjakarta/800/400", categories:[{id:14,name:"R1",price:5000000,available_seats:3},{id:15,name:"R2",price:3000000,available_seats:45},{id:16,name:"R3",price:1500000,available_seats:190}]},
  { id:6, name:"Blackpink World Tour", venue:"JIEXPO Kemayoran, Jakarta", event_date:"2026-10-05T20:00:00", status:"on_sale", description:"K-pop spektakuler Blackpink hadir di Jakarta.", banner_url:"https://picsum.photos/seed/blackpink/800/400", categories:[{id:18,name:"VVIP",price:3000000,available_seats:20},{id:19,name:"VIP",price:900000,available_seats:350}]},
  { id:7, name:"Taylor Swift The Eras Tour", venue:"Gelora Bung Karno, Jakarta", event_date:"2026-10-20T19:00:00", status:"on_sale", description:"Semua era Taylor Swift dalam satu panggung.", banner_url:"https://picsum.photos/seed/taylorswift/800/400", categories:[{id:24,name:"Cat 1",price:5000000,available_seats:10},{id:25,name:"Cat 2",price:3000000,available_seats:80}]},
  { id:8, name:"Metallica 72 Seasons Tour", venue:"Stadion Patriot, Bekasi", event_date:"2026-12-05T18:00:00", status:"on_sale", description:"Metallica menggebrak Jakarta.", banner_url:"https://picsum.photos/seed/metallica/800/400", categories:[{id:28,name:"Pit",price:2000000,available_seats:200},{id:29,name:"Tribun A",price:1000000,available_seats:400}]},
  { id:9, name:"Bruno Mars 24K Magic Tour", venue:"JIEXPO Kemayoran, Jakarta", event_date:"2026-12-20T20:00:00", status:"on_sale", description:"Bruno Mars kembali ke Jakarta.", banner_url:"https://picsum.photos/seed/brunomars/800/400", categories:[{id:44,name:"VVIP",price:4000000,available_seats:50},{id:45,name:"VIP",price:2000000,available_seats:300}]},
  { id:10, name:"Ariana Grande Eternal Sunshine", venue:"Gelora Bung Karno, Jakarta", event_date:"2027-01-10T19:30:00", status:"on_sale", description:"Ariana Grande perdana tampil di Indonesia.", banner_url:"https://picsum.photos/seed/arianag/800/400", categories:[{id:47,name:"Cat 1",price:5500000,available_seats:30},{id:48,name:"Cat 2",price:3000000,available_seats:120}]},
];

async function req(path, opts={}) {
  try {
    const r = await fetch(BASE + path, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers||{}) },
      signal: AbortSignal.timeout(5000),
    });
    return await r.json();
  } catch {
    return null;
  }
}

export const api = {
  async getEvents() {
    const r = await req("/catalog?limit=50");
    return r?.data || DEMO_EVENTS;
  },
  async getEvent(id) {
    const r = await req(`/events/${id}`);
    return r?.data || DEMO_EVENTS.find(e=>e.id==id);
  },
  async login(username, password) {
    const r = await req("/auth/login", {
      method:"POST", body: JSON.stringify({username,password})
    });
    if (r?.data) return { ok:true, user:r.data.user||r.data };
    // demo fallback
    return { ok:true, user:{id:Date.now(),username,role:"user",demo:true} };
  },
  async register(username, email, password) {
    const r = await req("/auth/register", {
      method:"POST", body: JSON.stringify({username,email,password})
    });
    if (r?.data) return { ok:true, user:r.data.user||r.data };
    return { ok:true, user:{id:Date.now(),username,email,role:"user",demo:true} };
  },
  async createOrder(userId, eventId, categoryId, qty) {
    const r = await req("/orders", {
      method:"POST",
      body: JSON.stringify({user_id:userId,event_id:eventId,category_id:categoryId,quantity:qty})
    });
    return r?.data || r || { id:"ORD-DEMO-"+Date.now(), status:"locked" };
  },
  async createPayment(orderId, amount, method) {
    const r = await req("/payments", {
      method:"POST",
      body: JSON.stringify({order_id:orderId,amount,payment_method:method})
    });
    return r?.data || r || { id:"PAY-DEMO-"+Date.now(), status:"success" };
  },
  async getOrders(userId) {
    const r = await req(`/orders?user_id=${userId}`);
    return r?.data || [];
  },
  async getNotifications(userId) {
    const r = await req(`/notifications?user_id=${userId}`);
    return r?.data || [];
  },
  async adminGetStats() {
    const [ev, ord] = await Promise.all([req("/catalog"), req("/orders")]);
    return {
      events: ev?.data?.length || 10,
      orders: ord?.data?.length || 60,
      revenue: 125000000,
      users: 50,
    };
  },
};