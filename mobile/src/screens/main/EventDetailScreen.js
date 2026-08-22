import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { formatPrice, formatDate } from "../../utils/format";
import C from "../../utils/colors";

export default function EventDetailScreen({ route, navigation }) {
  const { event: ev } = route.params;
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState(null);
  const [processing, setProcessing] = useState(false);

  const PAY = [
    {id:"gopay",label:"GoPay",emoji:"💚"},
    {id:"ovo",label:"OVO",emoji:"💜"},
    {id:"dana",label:"DANA",emoji:"💙"},
    {id:"bank_transfer",label:"Transfer",emoji:"🏦"},
    {id:"credit_card",label:"Kartu Kredit",emoji:"💳"},
  ];

  async function handleBuy() {
    if (!user) return Alert.alert("Login Dulu","Kamu harus login untuk membeli tiket.");
    if (!selected) return Alert.alert("Pilih Kursi","Pilih kategori kursi terlebih dahulu.");
    setPayModal(true);
  }

  async function doPayment() {
    if (!payMethod) return Alert.alert("Pilih Metode","Pilih metode pembayaran.");
    setProcessing(true);
    try {
      const order = await api.createOrder(user.id, ev.id, selected.id, qty);
      await api.createPayment(order.id, selected.price*qty, payMethod);
      setPayModal(false);
      Alert.alert("🎉 Berhasil!",
        `Tiket ${ev.name}
${selected.name} ×${qty}
Total: ${formatPrice(selected.price*qty)}`,
        [{text:"Lihat Tiket",onPress:()=>navigation.navigate("Orders")}]
      );
    } catch {
      Alert.alert("Gagal","Terjadi kesalahan. Coba lagi.");
    } finally { setProcessing(false); }
  }

  return (
    <View style={{flex:1,backgroundColor:C.bg}}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={s.banner}>
          <Image source={{uri:ev.banner_url||"https://picsum.photos/seed/concert/800/400"}} style={StyleSheet.absoluteFill} resizeMode="cover"/>
          <LinearGradient colors={["transparent","rgba(10,10,15,0.95)"]} style={StyleSheet.absoluteFill}/>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff"/>
          </TouchableOpacity>
          <View style={s.bannerContent}>
            <View style={s.onSaleBadge}><Text style={s.onSaleText}>🔥 ON SALE</Text></View>
            <Text style={s.eventName}>{ev.name}</Text>
            <Text style={s.eventMeta}>📍 {ev.venue}</Text>
            <Text style={s.eventMeta}>📅 {formatDate(ev.event_date)}</Text>
          </View>
        </View>

        <View style={s.body}>
          {ev.description&&(
            <View style={s.section}>
              <Text style={s.sectionTitle}>Tentang Event</Text>
              <Text style={s.desc}>{ev.description}</Text>
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionTitle}>Pilih Kategori Kursi</Text>
            {(ev.categories||[]).map(cat=>{
              const soldOut = (cat.available_seats||0)===0;
              const active  = selected?.id===cat.id;
              return (
                <TouchableOpacity key={cat.id}
                  style={[s.catCard, active&&s.catActive, soldOut&&{opacity:0.4}]}
                  disabled={soldOut} onPress={()=>{setSelected(cat);setQty(1);}}>
                  <View>
                    <Text style={s.catName}>{cat.name}</Text>
                    <Text style={s.catSeats}>{soldOut?"Habis":`${cat.available_seats} kursi tersisa`}</Text>
                  </View>
                  <Text style={[s.catPrice,active&&{color:C.primary}]}>{formatPrice(cat.price)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected&&(
            <View style={s.section}>
              <Text style={s.sectionTitle}>Jumlah Tiket</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity style={s.qtyBtn} onPress={()=>setQty(q=>Math.max(1,q-1))}>
                  <Text style={s.qtyBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={s.qtyNum}>{qty}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={()=>setQty(q=>Math.min(selected.available_seats,q+1))}>
                  <Text style={s.qtyBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottom}>
        {selected?(
          <View style={s.bottomContent}>
            <View>
              <Text style={{color:C.text3,fontSize:12}}>Total</Text>
              <Text style={{color:C.primary,fontSize:20,fontWeight:"900"}}>{formatPrice(selected.price*qty)}</Text>
            </View>
            <TouchableOpacity onPress={handleBuy} activeOpacity={0.85}>
              <LinearGradient colors={[C.primary,"#ff0066"]} style={s.buyBtn} start={{x:0,y:0}} end={{x:1,y:0}}>
                <Text style={s.buyBtnTxt}>🎫 WAR TIKET!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ):(
          <Text style={{color:C.text3,textAlign:"center"}}>↑ Pilih kategori kursi</Text>
        )}
      </View>

      {/* Payment Modal */}
      <Modal visible={payModal} transparent animationType="slide" onRequestClose={()=>setPayModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Pilih Pembayaran</Text>
            <Text style={s.modalSub}>{ev.name} · {selected?.name} ×{qty}</Text>
            <Text style={s.modalTotal}>{selected&&formatPrice(selected.price*qty)}</Text>
            <View style={s.payGrid}>
              {PAY.map(m=>(
                <TouchableOpacity key={m.id} style={[s.payItem,payMethod===m.id&&s.payActive]} onPress={()=>setPayMethod(m.id)}>
                  <Text style={{fontSize:24}}>{m.emoji}</Text>
                  <Text style={{color:C.text2,fontSize:11,marginTop:4}}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{flexDirection:"row",gap:10}}>
              <TouchableOpacity style={s.cancelBtn} onPress={()=>setPayModal(false)}>
                <Text style={{color:C.text3,fontWeight:"600"}}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doPayment} disabled={processing} style={{flex:2}}>
                <LinearGradient colors={[C.primary,"#ff0066"]} style={s.payBtn}>
                  {processing?<ActivityIndicator color="#fff"/>:<Text style={s.buyBtnTxt}>Bayar</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  banner:       {height:280,justifyContent:"flex-end"},
  backBtn:      {position:"absolute",top:48,left:16,width:40,height:40,borderRadius:20,backgroundColor:"rgba(0,0,0,0.5)",alignItems:"center",justifyContent:"center"},
  bannerContent:{padding:20},
  onSaleBadge:  {backgroundColor:C.primary,alignSelf:"flex-start",paddingHorizontal:10,paddingVertical:4,borderRadius:99,marginBottom:8},
  onSaleText:   {color:"#fff",fontSize:11,fontWeight:"700"},
  eventName:    {fontSize:22,fontWeight:"900",color:"#fff",marginBottom:4},
  eventMeta:    {fontSize:13,color:"rgba(255,255,255,0.8)",marginBottom:2},
  body:         {padding:16},
  section:      {marginBottom:24},
  sectionTitle: {fontSize:16,fontWeight:"700",color:C.text1,marginBottom:12},
  desc:         {fontSize:14,color:C.text2,lineHeight:22},
  catCard:      {flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:C.card,borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:C.border},
  catActive:    {borderColor:C.primary,backgroundColor:"rgba(255,77,0,0.08)"},
  catName:      {fontSize:15,fontWeight:"700",color:C.text1,marginBottom:3},
  catSeats:     {fontSize:12,color:C.text3},
  catPrice:     {fontSize:15,fontWeight:"700",color:C.text2},
  qtyRow:       {flexDirection:"row",alignItems:"center",gap:20},
  qtyBtn:       {width:40,height:40,borderRadius:20,backgroundColor:C.card,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:C.border},
  qtyBtnTxt:    {color:C.text1,fontSize:22,lineHeight:26},
  qtyNum:       {fontSize:24,fontWeight:"700",color:C.text1,minWidth:40,textAlign:"center"},
  bottom:       {backgroundColor:C.bg2,borderTopWidth:1,borderTopColor:C.border,padding:16},
  bottomContent:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  buyBtn:       {paddingHorizontal:24,paddingVertical:14,borderRadius:12},
  buyBtnTxt:    {color:"#fff",fontWeight:"900",fontSize:16},
  modalOverlay: {flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"},
  modalBox:     {backgroundColor:C.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24},
  modalTitle:   {fontSize:20,fontWeight:"900",color:C.text1,marginBottom:4},
  modalSub:     {color:C.text3,fontSize:13,marginBottom:4},
  modalTotal:   {fontSize:28,fontWeight:"900",color:C.primary,marginBottom:20},
  payGrid:      {flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:20},
  payItem:      {width:"30%",backgroundColor:C.bg3,borderRadius:12,padding:12,alignItems:"center",borderWidth:1,borderColor:C.border},
  payActive:    {borderColor:C.primary,backgroundColor:"rgba(255,77,0,0.1)"},
  cancelBtn:    {flex:1,paddingVertical:14,borderRadius:12,borderWidth:1,borderColor:C.border,alignItems:"center"},
  payBtn:       {paddingVertical:14,borderRadius:12,alignItems:"center"},
});