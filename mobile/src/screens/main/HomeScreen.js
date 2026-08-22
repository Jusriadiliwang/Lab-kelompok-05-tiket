import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image, StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { formatPrice, formatDateShort } from "../../utils/format";
import C from "../../utils/colors";

export default function HomeScreen({ navigation }) {
  const [events, setEvents]     = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = await api.getEvents();
    setEvents(data); setFiltered(data); setLoading(false); setRefreshing(false);
  }
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{
    const q = search.toLowerCase();
    setFiltered(events.filter(e=>
      e.name.toLowerCase().includes(q)||(e.venue||"").toLowerCase().includes(q)
    ));
  },[search,events]);

  function EventCard({ item:ev }) {
    const min = Math.min(...(ev.categories||[]).map(c=>c.price||0));
    const seats = (ev.categories||[]).reduce((s,c)=>s+(c.available_seats||0),0);
    const sold = seats===0;
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.85}
        onPress={()=>navigation.navigate("EventDetail",{event:ev})}>
        <Image source={{uri:ev.banner_url||"https://picsum.photos/seed/concert/800/400"}}
          style={s.img} resizeMode="cover"/>
        <View style={[s.badge, sold&&{backgroundColor:C.danger}]}>
          <Text style={s.badgeText}>{sold?"HABIS":"TERSEDIA"}</Text>
        </View>
        <View style={s.info}>
          <Text style={s.venue} numberOfLines={1}>📍 {ev.venue}</Text>
          <Text style={s.name}  numberOfLines={2}>{ev.name}</Text>
          <Text style={s.date}>📅 {formatDateShort(ev.event_date)}</Text>
          <View style={s.footer}>
            <Text style={s.price}>{min?formatPrice(min):"Gratis"}</Text>
            <Text style={s.seats}>{sold?"Habis":seats.toLocaleString("id-ID")+" kursi"}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) return (
    <View style={s.centered}>
      <ActivityIndicator size="large" color={C.primary}/>
      <Text style={{color:C.text3,marginTop:12}}>Memuat konser...</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
      {/* Header */}
      <View style={s.header}>
        <View style={s.logoRow}>
          <View style={s.logoBox}><Text style={{fontSize:18}}>🎫</Text></View>
          <Text style={s.logoText}>War<Text style={{color:C.primary}}>Tiket</Text></Text>
        </View>
        <TouchableOpacity style={s.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color={C.text1}/>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={C.text3} style={{marginRight:8}}/>
        <TextInput
          style={s.searchInput} placeholder="Cari konser atau venue..."
          placeholderTextColor={C.text3} value={search} onChangeText={setSearch}
        />
        {search?<TouchableOpacity onPress={()=>setSearch("")}>
          <Ionicons name="close-circle" size={18} color={C.text3}/>
        </TouchableOpacity>:null}
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          {val:events.filter(e=>e.status==="on_sale").length,lbl:"Event Aktif"},
          {val:events.reduce((s,e)=>s+(e.categories||[]).reduce((a,c)=>a+(c.available_seats||0),0),0).toLocaleString("id-ID"),lbl:"Kursi"},
        ].map((st,i)=>(
          <View key={i} style={s.stat}>
            <Text style={s.statVal}>{st.val}</Text>
            <Text style={s.statLbl}>{st.lbl}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={filtered} keyExtractor={e=>String(e.id)}
        renderItem={EventCard}
        numColumns={2} columnWrapperStyle={{gap:12}}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={C.primary}/>}
        ListEmptyComponent={<View style={s.empty}><Text style={{fontSize:40}}>🎵</Text><Text style={{color:C.text3,marginTop:8}}>Tidak ada event.</Text></View>}
        ListHeaderComponent={<Text style={s.sectionTitle}>🔥 <Text style={{color:C.primary}}>Top Events</Text></Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex:1,backgroundColor:C.bg},
  centered:  {flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center"},
  header:    {flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:16,paddingTop:48,borderBottomWidth:1,borderBottomColor:C.border},
  logoRow:   {flexDirection:"row",alignItems:"center",gap:8},
  logoBox:   {width:36,height:36,borderRadius:10,backgroundColor:C.primary,alignItems:"center",justifyContent:"center"},
  logoText:  {fontSize:22,fontWeight:"900",color:C.text1},
  notifBtn:  {width:40,height:40,borderRadius:20,backgroundColor:C.bg3,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:C.border},
  searchWrap:{flexDirection:"row",alignItems:"center",margin:12,backgroundColor:C.bg3,borderRadius:99,paddingHorizontal:14,borderWidth:1,borderColor:C.border},
  searchInput:{flex:1,color:C.text1,paddingVertical:10,fontSize:14},
  statsRow:  {flexDirection:"row",marginHorizontal:12,marginBottom:4,gap:10},
  stat:      {flex:1,backgroundColor:C.card,borderRadius:12,padding:10,alignItems:"center",borderWidth:1,borderColor:C.border},
  statVal:   {fontSize:18,fontWeight:"900",color:C.primary},
  statLbl:   {fontSize:11,color:C.text3,marginTop:2},
  list:      {padding:12,paddingTop:0,gap:12},
  sectionTitle:{fontSize:18,fontWeight:"800",color:C.text1,marginVertical:12},
  card:      {flex:1,backgroundColor:C.card,borderRadius:16,overflow:"hidden",borderWidth:1,borderColor:C.border},
  img:       {width:"100%",height:120},
  badge:     {position:"absolute",top:8,left:8,backgroundColor:C.success,paddingHorizontal:8,paddingVertical:3,borderRadius:99},
  badgeText: {color:"#000",fontSize:9,fontWeight:"800"},
  info:      {padding:10},
  venue:     {fontSize:10,color:C.text3,marginBottom:3},
  name:      {fontSize:13,fontWeight:"700",color:C.text1,marginBottom:3},
  date:      {fontSize:10,color:C.text3,marginBottom:6},
  footer:    {flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  price:     {fontSize:13,fontWeight:"800",color:C.primary},
  seats:     {fontSize:10,color:C.text3},
  empty:     {alignItems:"center",paddingVertical:40},
});