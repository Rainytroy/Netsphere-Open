在设置模块，我们需要对API服务进行设置，用户可以添加一个AI服务，填写自己的API KEY，保存并使用。

所以我们需要在系统中构建一个AI服务模块，在接下来的工作中，我们可能会在很多场景使用到AI服务。
例如
1、在工作任务中处理和输出
2、在用户创建NPC之后，综合NPC的知识背景、行动原则、积极性参数和积极性参数描述等信息，总结出一段文本填充到描述字段中
3、在工作流中调用来判断工作流的流向

# DeepSeek API使用说明
首次调用 API

DeepSeek API 使用与 OpenAI 兼容的 API 格式，通过修改配置，您可以使用 OpenAI SDK 来访问 DeepSeek API，或使用与 OpenAI API 兼容的软件。

|PARAM|VALUE|
|-|-|
|base_url *       |`https://api.deepseek.com`|
|api_key|apply for an [API key](https://platform.deepseek.com/api_keys)|

* 出于与 OpenAI 兼容考虑，您也可以将 `base_url` 设置为 `https://api.deepseek.com/v1` 来使用，但注意，此处 `v1` 与模型版本无关。

* **`deepseek-chat` 模型已全面升级为 DeepSeek-V3，接口不变。** 通过指定 `model='deepseek-chat'` 即可调用 DeepSeek-V3。

* **`deepseek-reasoner` 是 DeepSeek 最新推出的[推理模型](https://api-docs.deepseek.com/zh-cn/guides/reasoning_model) DeepSeek-R1**。通过指定 `model='deepseek-reasoner'`，即可调用 DeepSeek-R1。

## 调用对话 API[​](https://api-docs.deepseek.com/zh-cn/#%E8%B0%83%E7%94%A8%E5%AF%B9%E8%AF%9D-api)

在创建 API key 之后，你可以使用以下样例脚本的来访问 DeepSeek API。样例为非流式输出，您可以将 stream 设置为 true 来使用流式输出。



## curl

```Plain Text
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <DeepSeek API Key>" \
  -d '{
        "model": "deepseek-chat",
        "messages": [
          {"role": "system", "content": "You are a helpful assistant."},
          {"role": "user", "content": "Hello!"}
        ],
        "stream": false
      }'
```

## python

```Plain Text
# Please install OpenAI SDK first: `pip3 install openai`

from openai import OpenAI

client = OpenAI(api_key="<DeepSeek API Key>", base_url="https://api.deepseek.com")

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "Hello"},
    ],
    stream=False
)

print(response.choices[0].message.content)
```

## nodejs

```Plain Text
// Please install OpenAI SDK first: `npm install openai`

import OpenAI from "openai";

const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: '<DeepSeek API Key>'
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    model: "deepseek-chat",
  });

  console.log(completion.choices[0].message.content);
}

main();
```

