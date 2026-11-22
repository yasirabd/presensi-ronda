import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Pressable, ScrollView,
  Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';

import { type } from './theme/typography';

const useMotion = create<{paused: boolean; toggle: () => void}>(set => ({
  paused: false, toggle: () => set(s => ({paused: !s.paused})),
}));
const picture = require('../assets/village-night.webp');
const driver = Platform.OS !== 'web';
const description = 'Dari jalan desa, sawah dan rumah warga terlihat di bawah rembulan. Tiga warga berkumpul di pos ronda yang diterangi lentera.';

function useSceneMotion() {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduced, setReduced] = useState(true);
  const {paused, toggle} = useMotion();
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    const state = AppState.addEventListener('change', value => setActive(value === 'active'));
    setActive(AppState.currentState === 'active');
    if (Platform.OS === 'web') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const sync = () => setReduced(media.matches);
      sync();
      media.addEventListener('change', sync);
      return () => { state.remove(); media.removeEventListener('change', sync); };
    }
    let subscribed = true;
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (subscribed) setReduced(value); }).catch(() => {});
    return () => { subscribed = false; state.remove(); motion.remove(); };
  }, []);
  return {visible: active && focused, running: active && focused && !reduced && !paused, paused, toggle, reduced};
}

function OwlSound({visible}: {visible:boolean}) {
  const player = useAudioPlayer(require('../assets/owl-night.mp3'));
  const [enabled,setEnabled] = useState(false);
  useEffect(() => {
    if (!visible) {
      player.pause();
      setEnabled(false);
    }
  }, [visible,player]);
  function toggleSound() {
    if (enabled) player.pause();
    else {
      player.loop = true;
      player.volume = .4;
      player.play();
    }
    setEnabled(!enabled);
  }
  return <Pressable accessibilityRole="switch" aria-checked={enabled} accessibilityState={{checked:enabled}}
    accessibilityLabel="Suara burung hantu" onPress={toggleSound} style={[styles.control,{paddingHorizontal:12,minWidth:44}]}>
    <Ionicons name={enabled?'volume-medium':'volume-mute'} size={19} color="white"/>
  </Pressable>;
}

function Irrigation({running}: {running:boolean}) {
  const flow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running) return;
    const loop = Animated.loop(Animated.timing(flow,{toValue:1,duration:1250,
      easing:Easing.linear,useNativeDriver:driver,isInteraction:false}));
    loop.start();
    return () => loop.stop();
  }, [flow,running]);
  const opacity = flow.interpolate({inputRange:[0,.2,.7,1],outputRange:[0,.78,.5,0]});
  return <>
    <Animated.View style={{position:'absolute',left:'22.3%',top:'91.7%',width:'1.1%',height:'3%',
      opacity,transform:[{translateY:flow.interpolate({inputRange:[0,1],outputRange:[0,6]})}]}}>
      <Svg width="100%" height="100%" viewBox="0 0 12 36" preserveAspectRatio="none">
        <Path d="M2 1q4 8 5 17m1 6 2 8" stroke="#d4f1f4" fill="none" strokeWidth="1.7"/>
      </Svg>
    </Animated.View>
    <Animated.View style={{position:'absolute',left:'20.9%',top:'96.4%',width:'5.4%',height:'1.5%',
      borderRadius:100,borderWidth:1,borderColor:'#c4e5e9',opacity,
      transform:[{scale:flow.interpolate({inputRange:[0,1],outputRange:[.3,1.3]})}]}}/>
  </>;
}

// The wide and terrace views use the same painted plate. The anchor is the lantern above the table.
function Landscape({width,height,wide,camera,wind,running}: {
  width:number; height:number; wide:boolean; running:boolean; camera:Animated.Value; wind:Animated.Value;
}) {
  const w=Math.max(width,height*1.5), h=w/1.5;
  const anchorX=.66, anchorY=.51;
  const left=Math.max(width-w,Math.min(0,width*(wide?.67:.53)-w*anchorX));
  const top=Math.max(height-h,Math.min(0,height*.48-h*anchorY));
  const zoom=wide?1.62:1.85;
  const approachY=wide?anchorY:.22;
  const cameraLayer=(depth:number)=>{
    const scale=1+(zoom-1)*depth;
    return {transform:[
      {translateX:camera.interpolate({inputRange:[0,1],outputRange:[0,(.5-anchorX)*w*(scale-1)]})},
      {translateY:camera.interpolate({inputRange:[0,1],outputRange:[0,(.5-approachY)*h*(scale-1)]})},
      {scale:camera.interpolate({inputRange:[0,1],outputRange:[1,scale]})},
    ]};
  };
  const gust=(delay:number,angle:number)=>wind.interpolate({
    inputRange:[0,.15+delay,.35+delay,.58+delay,.77+delay,1],
    outputRange:['0deg','0deg',angle+'deg',(-angle*.28)+'deg','0deg','0deg'],
  });
  return <View accessible accessibilityLabel={description} accessibilityRole="image" pointerEvents="none"
    style={[StyleSheet.absoluteFill,{overflow:'hidden'}]}>
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{position:'absolute',left,top,width:w,height:h}}>
      <Animated.View style={[StyleSheet.absoluteFill,cameraLayer(1)]}>
        <Image source={picture} resizeMode="stretch" fadeDuration={0} style={{width:'100%',height:'100%'}}/>
        <Irrigation running={running}/>
        <Animated.View style={[StyleSheet.absoluteFill,{opacity:wind.interpolate({inputRange:[0,.3,.62,1],outputRange:[.16,.75,.24,.16]})}]}>
          <Svg width="100%" height="100%" viewBox="0 0 600 400">
            {[[105,48],[149,31],[202,86],[246,32],[375,58],[411,27],[487,77]].map(([x,y])=><Circle key={x} cx={x} cy={y} r=".8" fill="#f4ebd7"/>)}
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill,cameraLayer(1.16)]}>
        {/* Silhouettes overlap the edges of the painted garden. Each pivots at its own stem. */}
        <Animated.View style={{position:'absolute',left:'-2%',bottom:'-2%',width:'21%',height:'11%',transformOrigin:'bottom left',transform:[{rotate:gust(0,3)}]}}>
          <Svg width="100%" height="100%" viewBox="0 0 220 72" preserveAspectRatio="none">
            {Array.from({length:34},(_,i)=>{
              const x=i*6.5, tip=18+((i*23)%44);
              return <Path key={i} d={`M${x} 72q0 -${tip*.7} -${8+i%11} -${tip}q15 15 19 ${tip}z`} fill={i%3===0?'#334d3d':'#182d30'}/>;
            })}
          </Svg>
        </Animated.View>
        <Animated.View style={{position:'absolute',right:'-3%',top:'12%',width:'23%',height:'28%',transformOrigin:'top right',transform:[{rotate:gust(.08,-2.6)}]}}>
          <Svg width="100%" height="100%" viewBox="0 0 150 100">
            <Path d="M150 0Q77 7 13 75q20-46 43-53l-8 14 15-20Q115-3 150 0Z" fill="#102d35"/>
            <Path d="M150 0Q91 24 72 81q2-49 25-64l-3 12 8-17z" fill="#153339"/>
            <Path d="M146 2Q84 16 19 70" stroke="#43604d" fill="none"/>
          </Svg>
        </Animated.View>
        <Animated.View style={{position:'absolute',left:'-4%',top:'-3%',width:'34%',height:'26%',transformOrigin:'top left',transform:[{rotate:gust(.16,2.1)}]}}>
          <Svg width="100%" height="100%" viewBox="0 0 200 110" preserveAspectRatio="none">
            <Path d="M0 1q95 0 192 90" stroke="#101e32" strokeWidth="3" fill="none"/>
            {Array.from({length:21},(_,i)=>{
              const x=i*8.8, y=1+x*x/440;
              return <Path key={i} d={`M${x} ${y}q18 21 9 50 0-22-9-50m0 0q20-1 35 19-18-14-35-19`} fill="#102536"/>;
            })}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  </View>;
}

type StageProps = PropsWithChildren<{
  terrace?:boolean;
  actions?:(depart:(navigate:()=>void)=>void)=>React.ReactNode;
}>;

export function VillageStage({children,terrace=false,actions}:StageProps) {
  const {width,height,fontScale}=useWindowDimensions();
  const wide=width/Math.max(1,fontScale)>=820;
  const safe=useSafeAreaInsets();
  const {visible,running,paused,toggle,reduced}=useSceneMotion();
  const camera=useRef(new Animated.Value(terrace?1:0)).current;
  const wind=useRef(new Animated.Value(0)).current;
  const departure=useRef<null|(()=>void)>(null);
  const stageHeight=wide?Math.max(570,Math.min(height,900)):Math.max(460,Math.min(height*.78,675));
  const imageHeight=wide?stageHeight:Math.min(Math.round(stageHeight*.66),Math.round(width*.76));
  useEffect(()=>{
    if(!running)return;
    const loop=Animated.loop(Animated.timing(wind,{toValue:1,duration:6200,easing:Easing.linear,useNativeDriver:driver,isInteraction:false}));
    loop.start();
    return ()=>loop.stop();
  },[running,wind]);
  useFocusEffect(useCallback(()=>{
    camera.setValue(terrace?1:0);
    return ()=>{departure.current=null;camera.stopAnimation();};
  },[camera,terrace]));
  useEffect(()=>{
    if(!running && departure.current){
      const navigate=departure.current;departure.current=null;camera.stopAnimation();navigate();
    }
  },[running,camera]);
  function depart(navigate:()=>void){
    if(departure.current)return;
    if(!running){navigate();return;}
    departure.current=navigate;
    Animated.timing(camera,{toValue:1,duration:900,easing:Easing.inOut(Easing.cubic),useNativeDriver:driver,isInteraction:false})
      .start(({finished})=>{
        if(finished && departure.current){departure.current=null;navigate();}
      });
  }
  return <View style={{backgroundColor:'#0a1423',minHeight:stageHeight}}>
    <View style={{position:'absolute',top:wide?0:safe.top+54,width:'100%',height:imageHeight,overflow:'hidden'}}>
      <Landscape width={width} height={imageHeight} wide={wide} camera={camera} wind={wind} running={running}/>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs><LinearGradient id="shade" x1="0%" y1="0%" x2={wide?'100%':'0%'} y2={wide?'0%':'100%'}>
            <Stop offset="0" stopColor="#081326" stopOpacity={wide?.91:.28}/>
            <Stop offset={wide?'.42':'.52'} stopColor="#081326" stopOpacity={wide?.58:.02}/>
            <Stop offset="1" stopColor="#0a1423" stopOpacity={wide?.03:1}/>
          </LinearGradient></Defs>
          <Rect width="100%" height="100%" fill="url(#shade)"/>
        </Svg>
      </View>
    </View>
    <View style={[styles.header,{paddingTop:safe.top+12,paddingLeft:safe.left+(wide?48:18),paddingRight:safe.right+(wide?48:18)}]}>
      <View style={styles.brand}><Image source={require('../public/ronda-pak-owl.png')} style={{width:36,height:36}}/>
        <Text style={[type.wordmark,{color:'white'}]}>Ronda Pak</Text></View>
      <View style={{flexDirection:'row',gap:4}}><OwlSound visible={visible}/>
      {!reduced && <Pressable accessibilityLabel={paused?'Putar animasi':'Jeda animasi'} accessibilityRole="button" onPress={toggle} style={styles.control}>
        <Ionicons name={paused?'play':'pause'} size={15} color="white"/><Text style={[type.label,{color:'white'}]}>{paused?'Putar':'Jeda'}</Text>
      </Pressable>}</View>
    </View>
    <View style={{minHeight:stageHeight-74,justifyContent:wide?'center':'flex-end',
      paddingTop:wide?24:stageHeight*(terrace?.47:.39),paddingBottom:wide?48:24,
      paddingLeft:safe.left+(wide?Math.min(88,width*.065):16),paddingRight:safe.right+16}}>
      <Animated.View style={{width:'100%',maxWidth:wide?(terrace?410:440):540,
        opacity:terrace?1:camera.interpolate({inputRange:[0,.5,1],outputRange:[1,0,0]})}}>
        {children}{actions?.(depart)}
      </Animated.View>
    </View>
  </View>;
}

export function NightLogin({children}:PropsWithChildren){
  const safe=useSafeAreaInsets();
  return <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
    style={{flex:1,backgroundColor:'#0a1423'}} contentContainerStyle={{paddingBottom:safe.bottom}}>
    <VillageStage terrace>{children}</VillageStage>
  </ScrollView>;
}

const styles=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,minHeight:64},
  brand:{flexDirection:'row',alignItems:'center',gap:8},
  control:{flexDirection:'row',alignItems:'center',gap:5,minHeight:44,borderRadius:22,paddingHorizontal:12,backgroundColor:'#16243b'},
});
