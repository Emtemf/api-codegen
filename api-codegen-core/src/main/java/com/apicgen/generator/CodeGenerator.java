package com.apicgen.generator;

import com.apicgen.config.CodegenConfig;
import com.apicgen.model.Api;

import java.util.Map;

/**
 * 代码生成器接口
 */
public interface CodeGenerator {

    /**
     * 生成 Controller
     * @return Map<文件名, 内容>
     */
    Map<String, String> generateController(Api api, CodegenConfig config);

    /**
     * 生成 Request 类（包括嵌套对象）
     * @return Map<文件名, 内容>
     */
    Map<String, String> generateRequest(Api api, CodegenConfig config);

    /**
     * 生成 Response 类（包括嵌套对象）
     * @return Map<文件名, 内容>
     */
    Map<String, String> generateResponse(Api api, CodegenConfig config);
}
