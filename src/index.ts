import { Context, Schema, h, Logger } from 'koishi'
import {} from 'koishi-plugin-cron'

import fs from 'node:fs';
import path from 'node:path';

export const name = 'how-to-cook'

export const inject = {
  "required": ["cron"]
}

const logger = new Logger('[Cook]>> ');

export interface Config {
  useProxy: string | false;
}

export const Config: Schema<Config> = Schema.object({
  useProxy: Schema.union([
    Schema.const(false).description('直连'),
    Schema.string().default('https://cf.ghproxy.cc/').description('使用加速链接'),
  ]).description('GitHub连接方式')
})


interface Recipe {
  title: string;
  category: string;
  image: any;
  introduction: string;
  difficulty: string;
  ingredients: string[] | null;
  calculations: string[] | null;
  steps: string[] | null;
  notes: string;
}

export function apply(ctx: Context, config: Config) {
  // write your plugin here
  let recipes:Recipe[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, './recipes.json'), 'utf-8'));
  let aquatic:Recipe[] = recipes.filter( obj => obj.category === 'aquatic'); // 水产
  let breakfast:Recipe[] = recipes.filter( obj => obj.category === 'breakfast'); // 早餐
  let condiment:Recipe[] = recipes.filter( obj => obj.category === 'condiment'); // 酱料
  let dessert:Recipe[] = recipes.filter( obj => obj.category === 'dessert'); // 甜品
  let drink:Recipe[] = recipes.filter( obj => obj.category === 'drink'); // 饮品
  let meat:Recipe[] = recipes.filter( obj => obj.category === 'meat_dish'); // 荤菜
  let halfFinished:Recipe[] = recipes.filter( obj => obj.category === 'semi-finished'); // 半成品
  let soup:Recipe[] = recipes.filter( obj => obj.category === 'soup'); // 汤粥
  let staple:Recipe[] = recipes.filter( obj => obj.category === 'staple'); // 主食
  let vegetable:Recipe[] = recipes.filter( obj => obj.category === 'vegetable_dish'); // 素菜
  let mainFood:Recipe[] = staple.concat(halfFinished).concat(meat).concat(vegetable).concat(aquatic).concat(soup);

  ctx.command('查看菜谱 <dish:string>')
  .example('查看菜谱 西红柿炒鸡蛋')
  .action(async ({session}, dishname) => {
    const dish = recipes.find(obj => obj.title === dishname);
    if(!dish) {
      return '404 Not Found @w@'
    }

    console.log(dish);
    const msg = h('figure');

    msg.children.push(h('message', `${dish.title}`));
    if(dish.introduction.length) {
      msg.children.push(h('message', `简介: ${dish.introduction}`));
    }

    if(dish.image) {
      let picUrl: string;
      if( config.useProxy === false ) {
        picUrl = dish.image[0];
      } else {
        picUrl = config.useProxy+dish.image[0];
      }
      msg.children.push(h('image', { url: picUrl }));
    }
    
    let str = '';
    if(dish.ingredients) {
      dish.ingredients.map(item => str = str + item + ', ')
      msg.children.push(h('message', `原料: ${str}`))
    }
    if(dish.calculations) {
      str = '';
      dish.calculations.map(item => str = str + item + '\r\n')
      msg.children.push(h('message', `用量: \r\n${str.trim()}`))
    }
    if(dish.steps) {
      str = '';
      dish.steps.map(item => str = str + item + '\r\n')
      msg.children.push(h('message', `步骤: \r\n${str.trim()}`))
    }
    
    if(dish.notes.length) {
      msg.children.push(h('message', dish.notes))
    }
    
    await session.send(msg);
  })


  const regEat = /吃(点|个|些)?(啥|什么)/
  const regDrink = /喝(点|个|些)?(啥|什么)/
  const regDessert = /(来|整|吃)(点|个)?(什么|啥)(甜品|点心|甜点|下午茶)/

  ctx.middleware((session, next) => {
    const date = new Date();
    const hour = date.getHours();
    let dish:Recipe;
    if(regEat.test(session.content)) { // 吃
      if(session.content.includes('早') || ( hour < 9 && hour > 4)) {
        dish = getRandomDish(breakfast);
      } else {
        dish = getRandomDish(mainFood);
      }
    } else if(regDrink.test(session.content)) {
      dish = getRandomDish(drink);
    } else if(regDessert.test(session.content)) {
      dish = getRandomDish(dessert);
    } else {
      return next()
    }
    return `建议 ${dish.title}`
  })

  // 每周一凌晨3点执行
  ctx.cron('0 3 * * 1', async () => {
    logger.info('Update Recipes');
    try {
      let qResponse:Recipe[] = await ctx.http.get('https://cdn.jsdelivr.net/gh/tongque0/HowToCook-json@main/json/simpleType.json');
      fs.writeFileSync(path.resolve(__dirname, './recipes.json'), JSON.stringify(qResponse));

      recipes = qResponse;
      aquatic = recipes.filter( obj => obj.category === 'aquatic'); // 水产
      breakfast = recipes.filter( obj => obj.category === 'breakfast'); // 早餐
      condiment = recipes.filter( obj => obj.category === 'condiment'); // 酱料
      dessert = recipes.filter( obj => obj.category === 'dessert'); // 甜品
      drink = recipes.filter( obj => obj.category === 'drink'); // 饮品
      meat = recipes.filter( obj => obj.category === 'meat_dish'); // 荤菜
      halfFinished = recipes.filter( obj => obj.category === 'semi-finished'); // 半成品
      soup = recipes.filter( obj => obj.category === 'soup'); // 汤粥
      staple = recipes.filter( obj => obj.category === 'staple'); // 主食
      vegetable = recipes.filter( obj => obj.category === 'vegetable_dish'); // 素菜
      mainFood = staple.concat(halfFinished).concat(meat).concat(vegetable).concat(aquatic).concat(soup);
    } catch(error) {
      logger.error(`Error:\r\n`+error);
    }
  })

}

function getRandomDish(dishArray: Recipe[]) {
  const number = dishArray.length;
  var index = Math.round(Math.random()*number);
  if(index === number) {index = 0;}
  return dishArray[index];
}





