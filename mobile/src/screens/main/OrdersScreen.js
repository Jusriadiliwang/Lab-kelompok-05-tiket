import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatPrice, formatDate } from "../../utils/format";
import C from "../../utils/colors";

const STATUS_COLOR = {
  paid:"#00d68f", confirmed:"#00d68f", locked:"#ffaa00",
  pending:"#ffaa00", cancelled:"#ff3d71", expired:"rgba(255,255,255,0.3)",
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if(user) api.getOrders(user.id).then(d=>{ setOrders(d); setLoading(false); });
    else setLoading(false);
  },[user]);

  if(!user) return (
    <View style={s.centered}>
      <Text style={{fontSize:40,marginBottom:12}}>🎫</Text>
      <Text style={{color:C.text3}}>Login untuk melihat tiket kamu</Text>
    </View>
  );

  if(loading) return <View style={s.centered}><ActivityIndicator size="large" color={C.primary}/></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🎟️ Tiket Saya</Text>
        <Text style={s.sub}>{orders.length} pesanan</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={i=>String(i.id)}
        contentContainerStyle={{padding:16}}
        renderItem={({item:o})=>(
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle} numberOfLines={2}>{o.event_name||"Event"}</Text>
              <View style={[s.statusBadge,{backgroundColor:(STATUS_COLOR[o.status]||C.text3)+"22",borderColor:(STATUS_COLOR[o.status]||C.text3)}]}>
                <Text style={[s.statusText,{color:STATUS_COLOR[o.status]||C.text3}]}>{(o.status||"").toUpperCase()}</Text>
              </View>
            </View>
            <Text style={s.meta}>🎵 {o.seat_category_name||o.category_name||"Kategori"}</Text>
            <Text style={s.meta}>📅 {o.created_at?formatDate(o.created_at):"-"}</Text>
            <View style={s.cardFooter}>
              <Text style={s.price}>{formatPrice(o.total_price||o.price||0)}</Text>
              <Text style={s.orderId}>#{o.id}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{fontSize:48,marginBottom:12}}>🎫</Text>
            <Text style={{color:C.text3,fontSize:16}}>Belum ada pesanan</Text>
          </View>
        }
      />
    </View>
  );
}
const s = StyleSheet.create({
  container:   {flex:1,backgroundColor:C.bg},
  centered:    {flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center"},
  header:      {padding:16,paddingTop:48,borderBottomWidth:1,borderBottomColor:C.border},
  title:       {fontSize:22,fontWeight:"900",color:C.text1},
  sub:         {fontSize:13,color:C.text3,marginTop:2},
  card:        {backgroundColor:C.card,borderRadius:16,padding:14,marginBottom:12,borderWidth:1,borderColor:C.border},
  cardHeader:  {flexDirection:"row",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8},
  cardTitle:   {flex:1,fontSize:15,fontWeight:"700",color:C.text1,marginRight:8},
  statusBadge: {paddingHorizontal:8,paddingVertical:3,borderRadius:99,borderWidth:1},
  statusText:  {fontSize:10,fontWeight:"700"},
  meta:        {fontSize:12,color:C.text3,marginBottom:3},
  cardFooter:  {flexDirection:"row",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTopWidth:1,borderTopColor:C.border},
  price:       {fontSize:16,fontWeight:"800",color:C.primary},
  orderId:     {fontSize:12,color:C.text3},
  empty:       {alignItems:"center",paddingVertical:60},
});