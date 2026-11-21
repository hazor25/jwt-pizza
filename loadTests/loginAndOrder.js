import { sleep, check, group, fail } from 'k6';
import http from 'k6/http'
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

export const options = {
  cloud: {
    distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 5, duration: '30s' },
        { target: 15, duration: '1m' },
        { target: 10, duration: '30s' },
        { target: 0, duration: '30s' },
      ],
      gracefulRampDown: '30s',
      exec: 'scenario_1',
    },
  },
}

export function scenario_1() {
  let response

  const vars = {}

  group('page_7 - https://pizza.hazor25.click/', function () {
    response = http.get('https://pizza.hazor25.click/', {
      headers: {
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/jxl,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'max-age=0',
        'if-modified-since': 'Thu, 12 Nov 2026 21:15:24 GMT',
        'if-none-match': '"392d4991b50c123270085c1bbeee2288"',
        priority: 'u=0, i',
        'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
      },
    })
    sleep(8.1)

    response = http.put(
      'https://pizza-service.hazor25.click/api/auth',
      '{"email":"test@jwt.com","password":"12345"}',
      {
        headers: {
          accept: '*/*',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
          origin: 'https://pizza.hazor25.click',
          priority: 'u=1, i',
          'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
        },
      }
    )
    if (!check(response, { 'status equals 200': (response) => response.status.toString() === '200' })) {
      console.log(response.body);
      fail('Login was *not* 200');
    }

    vars['token1'] = jsonpath.query(response.json(), '$.token')[0]

    sleep(4.2)

    response = http.get('https://pizza-service.hazor25.click/api/order/menu', {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        authorization: `Bearer ${vars['token1']}`,
        'content-type': 'application/json',
        'if-none-match': 'W/"1fc-cgG/aqJmHhElGCplQPSmgl2Gwk0"',
        origin: 'https://pizza.hazor25.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    })

    response = http.get(
      'https://pizza-service.hazor25.click/api/franchise?page=0&limit=20&name=*',
      {
        headers: {
          accept: '*/*',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'accept-language': 'en-US,en;q=0.9',
          authorization: `Bearer ${vars['token1']}`,
          'content-type': 'application/json',
          'if-none-match': 'W/"5c-UrU6FPurLC0JcnOrzddwdfUXFBA"',
          origin: 'https://pizza.hazor25.click',
          priority: 'u=1, i',
          'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
        },
      }
    )
    sleep(2.6)

    response = http.get('https://pizza-service.hazor25.click/api/user/me', {
      headers: {
        accept: '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        authorization: `Bearer ${vars['token1']}`,
        'content-type': 'application/json',
        'if-none-match': 'W/"5e-UdMQidFFqd24SoAQbSZvnIJe55E"',
        origin: 'https://pizza.hazor25.click',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    })
    sleep(1.1)

    response = http.post(
      'https://pizza-service.hazor25.click/api/order',
      '{"items":[{"menuId":1,"description":"Veggie","price":0.0038}],"storeId":"1","franchiseId":1}',
      {
        headers: {
          accept: '*/*',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'accept-language': 'en-US,en;q=0.9',
          authorization: `Bearer ${vars['token1']}`,
          'content-type': 'application/json',
          origin: 'https://pizza.hazor25.click',
          priority: 'u=1, i',
          'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
        },
      }
    )
    sleep(1.2)

    response = http.post(
      'https://pizza-factory.cs329.click/api/order/verify',
      '{"jwt":"eyJpYXQiOjE3OTUyMjMxMjQsImV4cCI6MTc5NTMwOTUyNCwiaXNzIjoiY3MzMjkuY2xpY2siLCJhbGciOiJSUzI1NiIsImtpZCI6Ik9TcF94VzhlM3kwNk1KS3ZIeW9sRFZMaXZXX2hnTWxhcFZSUVFQVndiY0UifQ.eyJ2ZW5kb3IiOnsiaWQiOiJoYXpvcjI1IiwibmFtZSI6Ikx1aXMifSwiZGluZXIiOnsiaWQiOjQsIm5hbWUiOiJ0ZXN0IHVzZXIiLCJlbWFpbCI6InRlc3RAand0LmNvbSJ9LCJvcmRlciI6eyJpdGVtcyI6W3sibWVudUlkIjoxLCJkZXNjcmlwdGlvbiI6IlZlZ2dpZSIsInByaWNlIjowLjAwMzh9XSwic3RvcmVJZCI6IjEiLCJmcmFuY2hpc2VJZCI6MSwiaWQiOjI4MH19.ReBD9IVNx7mcjB4VtcBtBvVTk-FvM2lKau46palmggi7g7syT6gSf8zxZ5hJYyDZ2EAwqUH9giwBDe30kbzouPELNjFRHirNZoiF6qkWRe86ZtXMoVPCDPqBv_d3L4nRy9ToMolu-KjDiNka7hMe8tj37YT3GRLO2ZjMD4hbxZ5JiOkcqPrzzuyqs2sOkUEWhB8VJbMQiB28HSaYhsLd1ZzMv4g_Z-qT0syFEdNe5qxwvV2wLcMitnAgMG9Dvcuwz5C4TStaz3lxHfxqnpkSAfmq8M7UMbRx_CY8TUf4ljN11VbZUJrHjxa_7XvxP7v7GwMqYXlX1J3XOF3xhHMsazDYO5cw7B8yP0ziFldQzLYC5Wi_rseVZXn99m9loaKI-OkqPEB0ye4FNb_jCczyMmxK3oHgsaNFD5J-aDG-gGUhKsAZ1cwsXqqVumQcjCs1A8J0MwJcfIC3JB3qsh2gZuXQSD8saptYSNMZpXVWyubn81NIgeaty0UBjFs9OqHsb9Knl62C2n03ZXwh9gx_wKYO-eAcUVE7XGmpg_IvtM1QXfKsrWMkIzamnPshrS1nW3uuryTYcineKwsoZ7FtXIeOQGSh5CgLyvJo6jbNEMwOHZb-YgzCIiH-Bi3VYuVC7bg3-JZbGsxoSkSDTQNl0EkGJqJ27-Q4DnERuV_y0Mk"}',
      {
        headers: {
          accept: '*/*',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'accept-language': 'en-US,en;q=0.9',
          authorization: `Bearer ${vars['token1']}`,
          'content-type': 'application/json',
          origin: 'https://pizza.hazor25.click',
          priority: 'u=1, i',
          'sec-ch-ua': '"Not-A.Brand";v="99", "Google Chrome";v="157", "Chromium";v="157"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'sec-fetch-storage-access': 'active',
        },
      }
    )
  })
}