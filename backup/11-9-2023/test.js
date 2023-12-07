var PLC = ['bastian','aec1','aec2','sick']

var values = PLC.map((value,nameindex) =>{
  return {name: PLC[nameindex],
  value: nameindex}
})

console.log(values)