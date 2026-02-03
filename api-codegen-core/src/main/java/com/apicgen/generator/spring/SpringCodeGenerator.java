package com.apicgen.generator.spring;

import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.CodeGenerator;
import com.apicgen.model.Api;

import java.util.Map;

/**
 * Spring MVC 代码生成器（预留）
 */
public class SpringCodeGenerator implements CodeGenerator {

    @Override
    public Map<String, String> generateController(Api api, CodegenConfig config) {
        // TODO: 实现 Spring MVC 风格的 Controller 生成
        throw new UnsupportedOperationException("Spring 代码生成器待实现");
    }

    @Override
    public Map<String, String> generateRequest(Api api, CodegenConfig config) {
        // TODO: 实现 Spring 风格的 Request 生成
        throw new UnsupportedOperationException("Spring 代码生成器待实现");
    }

    @Override
    public Map<String, String> generateResponse(Api api, CodegenConfig config) {
        // TODO: 实现 Spring 风格的 Response 生成
        throw new UnsupportedOperationException("Spring 代码生成器待实现");
    }
}
