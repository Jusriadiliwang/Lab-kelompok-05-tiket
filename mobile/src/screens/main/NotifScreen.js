import React, { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import C from "../../utils/colors";

const ICONS = {
  ticket_confirmed:"✅", payment_success:"💚", eticket:"🎫",
  order_expiring:"⏰", payment_failed:"❌", order_cancelled:"🚫",
};

export default function NotifScreen() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if(user) api.getNotifications(user.id).then(d=>{ setNotifs(d); setLoading(false); });
    else setLoading(false);
  },[user]);

  if(loading) return <View style={s.centered}><ActivityIndicator size="large" color={C.primary}/></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🔔 Notifikasi</Text>
      </View>
      <FlatList
        data={notifs} keyExtractor={n=>String(n.id)}
        contentContainerStyle={{padding:16}}
        renderItem={({item:n})=>(
          <View style={[s.card,!n.is_read&&s.unread]}>
            <Text style={s.icon}>{ICONS[n.type]||"📢"}</Text>
            <View style={{flex:1}}>
              <Text style={s.notifTitle}>{n.title}</Text>
              <Text style={s.notifMsg} numberOfLines={2}>{n.message}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{fontSize:48,marginBottom:12}}>🔔</Text>
            <Text style={{color:C.text3}}>Belum ada notifikasi</Text>
          </View>
        }
      />
    </View>
  );
}
const s = StyleSheet.create({
  container: {flex:1,backgroundColor:C.bg},
  centered:  {flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center"},
  header:    {padding:16,paddingTop:48,borderBottomWidth:1,borderBottomColor:C.border},
  title:     {fontSize:22,fontWeight:"900",color:C.text1},
  card:      {flexDirection:"row",alignItems:"flex-start",backgroundColor:C.card,borderRadius:14,padding:14,marginBottom:10,borderWidth:1,borderColor:C.border,gap:12},
  unread:    {borderColor:C.primary,borderLeftWidth:3},
  icon:      {fontSize:24},
  notifTitle:{fontSize:14,fontWeight:"700",color:C.text1,marginBottom:3},
  notifMsg:  {fontSize:12,color:C.text3,lineHeight:18},
  empty:     {alignItems:"center",paddingVertical:60},
});