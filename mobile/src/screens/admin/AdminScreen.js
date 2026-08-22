import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { formatPrice } from "../../utils/format";
import C from "../../utils/colors";

export default function AdminScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.adminGetStats().then(s=>{ setStats(s); setLoading(false); });
  },[]);

  if(loading) return <View style={s.centered}><ActivityIndicator size="large" color={C.accent}/></View>;

  const cards = [
    {icon:"ticket-outline",     label:"Total Events", val:stats.events,              color:"#6c63ff"},
    {icon:"receipt-outline",    label:"Total Orders",  val:stats.orders,              color:C.primary},
    {icon:"cash-outline",       label:"Revenue",       val:formatPrice(stats.revenue),color:C.success},
    {icon:"people-outline",     label:"Users",         val:stats.users,               color:C.warning},
  ];

  const actions = [
    {icon:"add-circle-outline",  label:"Tambah Event",   color:"#6c63ff"},
    {icon:"create-outline",      label:"Edit Event",     color:C.primary},
    {icon:"bar-chart-outline",   label:"Laporan",        color:C.success},
    {icon:"people-outline",      label:"Kelola User",    color:C.warning},
    {icon:"settings-outline",    label:"Pengaturan",     color:C.text2},
    {icon:"download-outline",    label:"Export Data",    color:"#00bcd4"},
  ];

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={["#1a1a3e","#12122a","#0a0a1a"]} style={s.hero}>
        <View style={s.heroIcon}><Ionicons name="settings-outline" size={32} color="#a78bfa"/></View>
        <Text style={s.heroTitle}>Admin Panel</Text>
        <Text style={s.heroSub}>WarTiket CMS · Kelompok 5</Text>
      </LinearGradient>

      {/* Stats */}
      <View style={s.statsGrid}>
        {cards.map((c,i)=>(
          <View key={i} style={[s.statCard,{borderTopColor:c.color}]}>
            <Ionicons name={c.icon} size={24} color={c.color} style={{marginBottom:6}}/>
            <Text style={[s.statVal,{color:c.color}]}>{c.val}</Text>
            <Text style={s.statLbl}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {actions.map((a,i)=>(
            <TouchableOpacity key={i} style={s.actionBtn} activeOpacity={0.8}>
              <View style={[s.actionIcon,{backgroundColor:a.color+"22"}]}>
                <Ionicons name={a.icon} size={22} color={a.color}/>
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* System status */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Status Sistem</Text>
        {[
          {name:"event-service:3001",   ok:true},
          {name:"ticket-service:3002",  ok:true},
          {name:"payment-service:3003", ok:true},
          {name:"notification-service:3004",ok:true},
          {name:"nginx load balancer",  ok:true},
          {name:"PostgreSQL",           ok:true},
          {name:"Redis",                ok:true},
          {name:"RabbitMQ",             ok:true},
        ].map((svc,i)=>(
          <View key={i} style={s.svcRow}>
            <View style={[s.dot,{backgroundColor:svc.ok?C.success:C.danger}]}/>
            <Text style={s.svcName}>{svc.name}</Text>
            <Text style={[s.svcStatus,{color:svc.ok?C.success:C.danger}]}>{svc.ok?"Online":"Offline"}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container:   {flex:1,backgroundColor:C.bg},
  centered:    {flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center"},
  hero:        {paddingTop:60,paddingBottom:28,alignItems:"center"},
  heroIcon:    {width:60,height:60,borderRadius:16,backgroundColor:"rgba(108,99,255,0.2)",alignItems:"center",justifyContent:"center",marginBottom:10},
  heroTitle:   {fontSize:24,fontWeight:"900",color:"#fff",marginBottom:4},
  heroSub:     {fontSize:13,color:"rgba(255,255,255,0.4)"},
  statsGrid:   {flexDirection:"row",flexWrap:"wrap",padding:12,gap:10},
  statCard:    {width:"47%",backgroundColor:C.card,borderRadius:14,padding:14,borderWidth:1,borderColor:C.border,borderTopWidth:3},
  statVal:     {fontSize:20,fontWeight:"900",marginBottom:2},
  statLbl:     {fontSize:11,color:C.text3},
  section:     {padding:16},
  sectionTitle:{fontSize:16,fontWeight:"700",color:C.text1,marginBottom:12},
  actionsGrid: {flexDirection:"row",flexWrap:"wrap",gap:10},
  actionBtn:   {width:"30%",backgroundColor:C.card,borderRadius:12,padding:12,alignItems:"center",borderWidth:1,borderColor:C.border},
  actionIcon:  {width:44,height:44,borderRadius:12,alignItems:"center",justifyContent:"center",marginBottom:6},
  actionLabel: {fontSize:11,color:C.text2,textAlign:"center"},
  svcRow:      {flexDirection:"row",alignItems:"center",backgroundColor:C.card,borderRadius:10,padding:12,marginBottom:8,borderWidth:1,borderColor:C.border},
  dot:         {width:8,height:8,borderRadius:4,marginRight:10},
  svcName:     {flex:1,fontSize:13,color:C.text2},
  svcStatus:   {fontSize:12,fontWeight:"600"},
});