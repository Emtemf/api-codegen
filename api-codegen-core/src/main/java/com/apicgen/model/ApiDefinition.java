package com.apicgen.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * API 定义根节点
 */
@Data
public class ApiDefinition {

    /**
     * API 列表
     */
    private List<Api> apis = new ArrayList<>();

    public ApiDefinition() {
    }

    public ApiDefinition(List<Api> apis) {
        this.apis = apis;
    }
}
