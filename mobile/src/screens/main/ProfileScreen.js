import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import C from "../../utils/colors";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert("Keluar","Yakin ingin keluar dari akun?",[
      {text:"Batal",style:"cancel"},
      {text:"Keluar",style:"destructive",onPress:logout},
    ]);
  }

  const menus = [
    {icon:"receipt-outline",    label:"Pesanan Saya",    onPress:()=>navigation.navigate("Orders")},
    {icon:"notifications-outline",label:"Notifikasi",   onPress:()=>navigation.navigate("Notif")},
    {icon:"shield-outline",     label:"Keamanan Akun",  onPress:()=>{}},
    {icon:"help-circle-outline",label:"Bantuan",        onPress:()=>{}},
    {icon:"information-circle-outline",label:"Tentang WarTiket",onPress:()=>{}},
  ];

  return (
    <View style={s.container}>
      {/* Hero */}
      <LinearGradient colors={[C.primary,"#ff0066","#6c63ff"]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(user?.username||"U")[0].toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{user?.username||"User"}</Text>
        <Text style={s.email}>{user?.email||"Kelompok 5 · WarTiket"}</Text>
        {user?.demo&&<View style={s.demoBadge}><Text style={s.demoText}>Mode Demo</Text></View>}
      </LinearGradient>

      {/* Menu */}
      <View style={s.menuCard}>
        {menus.map((m,i)=>(
          <TouchableOpacity key={i} style={[s.menuItem,i<menus.length-1&&{borderBottomWidth:1,borderBottomColor:C.border}]} onPress={m.onPress}>
            <View style={s.menuIcon}><Ionicons name={m.icon} size={20} color={C.primary}/></View>
            <Text style={s.menuLabel}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.text3}/>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color={C.danger} style={{marginRight:8}}/>
        <Text style={s.logoutText}>Keluar</Text>
      </TouchableOpacity>

      <Text style={s.version}>WarTiket v1.0 · Kelompok 5 Microservices</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container:  {flex:1,backgroundColor:C.bg},
  hero:       {paddingTop:60,paddingBottom:32,alignItems:"center"},
  avatar:     {width:80,height:80,borderRadius:40,backgroundColor:"rgba(255,255,255,0.2)",alignItems:"center",justifyContent:"center",marginBottom:12,borderWidth:2,borderColor:"rgba(255,255,255,0.4)"},
  avatarText: {fontSize:36,fontWeight:"900",color:"#fff"},
  name:       {fontSize:22,fontWeight:"900",color:"#fff",marginBottom:4},
  email:      {fontSize:13,color:"rgba(255,255,255,0.8)"},
  demoBadge:  {marginTop:8,backgroundColor:"rgba(255,255,255,0.2)",paddingHorizontal:12,paddingVertical:4,borderRadius:99},
  demoText:   {color:"#fff",fontSize:11,fontWeight:"600"},
  menuCard:   {margin:16,backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border},
  menuItem:   {flexDirection:"row",alignItems:"center",padding:16},
  menuIcon:   {width:36,height:36,borderRadius:10,backgroundColor:"rgba(255,77,0,0.1)",alignItems:"center",justifyContent:"center",marginRight:12},
  menuLabel:  {flex:1,fontSize:15,fontWeight:"500",color:C.text1},
  logoutBtn:  {flexDirection:"row",alignItems:"center",justifyContent:"center",margin:16,padding:14,backgroundColor:"rgba(255,61,113,0.1)",borderRadius:12,borderWidth:1,borderColor:"rgba(255,61,113,0.3)"},
  logoutText: {color:C.danger,fontWeight:"700",fontSize:15},
  version:    {textAlign:"center",color:C.text3,fontSize:11,marginBottom:16},
});