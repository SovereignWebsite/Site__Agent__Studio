// Shared GLSL chunks, concatenated into shaders as strings.
export const HASH = /* glsl */ `
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
`;
export const NOISE = HASH + /* glsl */ `
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);
 return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(.8,.6,-.6,.8);for(int i=0;i<5;i++){s+=a*vnoise(p);p=m*p*2.03;a*=.5;}return s;}
`;
export const COLOR = /* glsl */ `
vec3 toLin(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(.04045,c));}
vec3 toSrgb(vec3 c){c=max(c,0.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
`;
