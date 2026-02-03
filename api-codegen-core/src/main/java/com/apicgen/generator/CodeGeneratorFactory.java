package com.apicgen.generator;

import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.cxf.CxfCodeGenerator;
import com.apicgen.generator.spring.SpringCodeGenerator;

/**
 * 代码生成器工厂
 */
public class CodeGeneratorFactory {

    public static CodeGenerator getGenerator(CodegenConfig config) {
        if (config == null || config.getFramework() == CodegenConfig.FrameworkType.CXF) {
            return new CxfCodeGenerator();
        } else if (config.getFramework() == CodegenConfig.FrameworkType.SPRING) {
            return new SpringCodeGenerator();
        }
        throw new IllegalArgumentException("不支持的框架类型: " + config.getFramework());
    }
}
